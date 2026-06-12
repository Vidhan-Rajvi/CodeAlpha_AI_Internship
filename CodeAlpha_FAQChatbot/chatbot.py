"""
chatbot.py — FAQ Chatbot AI Engine
Uses NLTK + TF-IDF + Cosine Similarity
CodeAlpha Internship Task 2
"""

import json
import os
import re
import numpy as np

# ── NLTK Setup (auto-download on first run) ────────────────────────────────────
import nltk

_NLTK_PACKAGES = ["punkt", "punkt_tab", "stopwords", "wordnet", "omw-1.4"]
for _pkg in _NLTK_PACKAGES:
    try:
        nltk.download(_pkg, quiet=True)
    except Exception:
        pass

try:
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    from nltk.stem import WordNetLemmatizer
    _NLTK_OK = True
except Exception:
    _NLTK_OK = False

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# ─────────────────────────────────────────────────────────────────────────────
class FAQChatbot:

    CONFIDENCE_THRESHOLD = 0.15   # below this → "did you mean?" mode
    SUGGESTION_THRESHOLD = 0.03   # show suggestion only if above this

    SYNONYMS = {
        r"\bml\b": "machine learning",
        r"\bai\b": "artificial intelligence",
        r"\bdb\b": "database",
        r"\bsql\b": "structured query language",
        r"\bjs\b": "javascript",
        r"\bk8s\b": "kubernetes",
        r"\bdevops\b": "development operations",
        r"\bcicd\b": "continuous integration continuous deployment",
        r"\bgit\b": "version control git",
        r"\baws\b": "amazon web services",
        r"\bgcp\b": "google cloud platform",
        r"\bdocker\b": "container docker",
        r"\bvm\b": "virtual machine",
        r"\bip\b": "internet protocol",
        r"\bdns\b": "domain name system",
        r"\bvpn\b": "virtual private network",
        r"\bmac\b": "media access control",
        r"\b2fa\b": "two factor authentication",
        r"\bddos\b": "distributed denial of service",
        r"\bhttp\b": "hypertext transfer protocol",
        r"\bhttps\b": "hypertext transfer protocol secure",
        r"\bci/cd\b": "continuous integration continuous deployment",
    }

    def __init__(self, faq_path="faq.json"):
        self.faq_path   = faq_path
        self.faqs       = []
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
        self.tfidf_matrix = None

        if _NLTK_OK:
            self.lemmatizer = WordNetLemmatizer()
            self.stop_words = set(stopwords.words("english"))
        else:
            self.lemmatizer = None
            self.stop_words = set()

        self._load_and_build()

    # ── Data ──────────────────────────────────────────────────────────────────

    def _load_faqs(self):
        with open(self.faq_path, "r", encoding="utf-8") as f:
            self.faqs = json.load(f)

    def _save_faqs(self):
        with open(self.faq_path, "w", encoding="utf-8") as f:
            json.dump(self.faqs, f, indent=2, ensure_ascii=False)

    def _load_and_build(self):
        self._load_faqs()
        self._build_index()

    # ── NLP Preprocessing ─────────────────────────────────────────────────────

    def preprocess(self, text: str) -> str:
        text = text.lower()
        
        # Apply Synonym mapping
        for pattern, replacement in self.SYNONYMS.items():
            text = re.sub(pattern, replacement, text)

        text = re.sub(r"[^a-zA-Z\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()

        if _NLTK_OK:
            try:
                tokens = word_tokenize(text)
            except Exception:
                tokens = text.split()
            tokens = [
                self.lemmatizer.lemmatize(t)
                for t in tokens
                if t not in self.stop_words and len(t) > 1
            ]
        else:
            tokens = [t for t in text.split() if t not in self.stop_words and len(t) > 1]

        return " ".join(tokens)

    # ── Index ─────────────────────────────────────────────────────────────────

    def _build_index(self):
        # Weight question heavier (repeat 2x) but index answers too to increase recall
        processed = [self.preprocess(f"{faq['question']} {faq['question']} {faq.get('answer', '')}") for faq in self.faqs]
        self.tfidf_matrix = self.vectorizer.fit_transform(processed)

    # ── Public API ────────────────────────────────────────────────────────────

    def get_categories(self) -> list:
        seen = set()
        cats = []
        for faq in self.faqs:
            c = faq["category"]
            if c not in seen:
                seen.add(c)
                cats.append(c)
        return sorted(cats)

    def get_faqs_by_category(self, category: str) -> list:
        return [f for f in self.faqs if f["category"] == category]

    def get_suggested_questions(self, n: int = 6) -> list:
        """Return a mix of questions from different categories."""
        categories = self.get_categories()
        suggestions = []
        for cat in categories[:10]:
            cat_faqs = self.get_faqs_by_category(cat)
            if cat_faqs:
                suggestions.append(cat_faqs[0]["question"])
        return suggestions[:n]

    def search_faqs(self, query: str) -> list:
        q = query.lower().strip()
        if not q:
            return []
        return [
            f for f in self.faqs
            if q in f["question"].lower() or q in f["answer"].lower()
        ]

    def get_response(self, user_input: str, category_filter: str = None) -> dict:
        """
        Returns a dict:
        {
          "answer": str,
          "confidence": float (0-100),
          "category": str,
          "matched_question": str,
          "suggestions": list[str],
          "found": bool,
          "emoji": str
        }
        """
        if not user_input or not user_input.strip():
            return self._no_input_response()

        # ── Greetings / Small Talk Detection ─────────────────────────────────
        clean_input = user_input.lower().strip().strip("?!.")
        
        # Greetings
        if clean_input in [
            "hi", "hello", "hey", "greetings", "good morning", "good afternoon", 
            "good evening", "yo", "hola", "hi there", "hello there", "is anyone there", "welcome"
        ]:
            return {
                "answer": "Hello! I am your AI FAQ Assistant. How can I help you today? You can ask me technical questions, search for topics using the search bar, or choose from the categories on the sidebar!",
                "confidence": 100.0,
                "category": "Small Talk",
                "matched_question": "Greeting",
                "suggestions": self.get_suggested_questions(3),
                "found": True,
                "emoji": "👋",
            }
            
        # Thanks / Closures
        if clean_input in [
            "thanks", "thank you", "thank you so much", "awesome", "perfect", 
            "great", "ok", "okay", "bye", "goodbye", "see you", "see ya", "cool"
        ]:
            return {
                "answer": "You're very welcome! If you have any more questions, feel free to ask. Have a fantastic day!",
                "confidence": 100.0,
                "category": "Small Talk",
                "matched_question": "Thanks/Farewell",
                "suggestions": [],
                "found": True,
                "emoji": "😊",
            }

        # Help / Bot Info
        if clean_input in [
            "help", "what can you do", "who are you", "what are your capabilities", 
            "how to use", "commands", "menu", "info", "about"
        ]:
            categories_str = ", ".join(self.get_categories())
            return {
                "answer": f"I am a smart AI FAQ Assistant. I can help answer questions in details on these categories: {categories_str}. You can filter by category using the category list or dropdown, search keywords, or type custom questions directly!",
                "confidence": 100.0,
                "category": "Small Talk",
                "matched_question": "Help Request",
                "suggestions": self.get_suggested_questions(3),
                "found": True,
                "emoji": "💡",
            }

        # Decide working FAQ set
        working_faqs = self.faqs
        working_matrix = self.tfidf_matrix
        working_vectorizer = self.vectorizer

        if category_filter and category_filter != "All":
            filtered = [f for f in self.faqs if f["category"] == category_filter]
            if filtered:
                working_faqs = filtered
                local_vec = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
                local_matrix = local_vec.fit_transform(
                    [self.preprocess(f"{f['question']} {f['question']} {f.get('answer', '')}") for f in filtered]
                )
                working_matrix = local_matrix
                working_vectorizer = local_vec

        # Vectorize user input
        processed = self.preprocess(user_input)
        if not processed.strip():
            return self._no_input_response()

        try:
            user_vec = working_vectorizer.transform([processed])
        except Exception:
            return self._error_response()

        # Cosine similarity
        sims = cosine_similarity(user_vec, working_matrix).flatten()
        best_idx = int(np.argmax(sims))
        best_score = float(sims[best_idx])

        if best_score >= self.CONFIDENCE_THRESHOLD:
            faq = working_faqs[best_idx]
            return {
                "answer":           faq["answer"],
                "confidence":       round(best_score * 100, 1),
                "category":         faq["category"],
                "matched_question": faq["question"],
                "suggestions":      [],
                "found":            True,
                "emoji":            self._category_emoji(faq["category"]),
            }
        else:
            # Build "Did you mean?" suggestions from ALL faqs
            all_sims = cosine_similarity(
                self.vectorizer.transform([processed]), self.tfidf_matrix
            ).flatten()
            top_idxs = np.argsort(all_sims)[::-1][:4]
            suggestions = [
                self.faqs[i]["question"]
                for i in top_idxs
                if all_sims[i] > self.SUGGESTION_THRESHOLD
            ]
            return {
                "answer":           "I couldn't find a precise answer to your question. Try rephrasing, check other categories, or select one of the suggested questions below.",
                "confidence":       round(best_score * 100, 1),
                "category":         "",
                "matched_question": "",
                "suggestions":      suggestions[:3],
                "found":            False,
                "emoji":            "🤔",
            }

    def add_faq(self, category: str, question: str, answer: str) -> bool:
        new_id = max((f.get("id", 0) for f in self.faqs), default=0) + 1
        self.faqs.append({
            "id":       new_id,
            "category": category.strip(),
            "question": question.strip(),
            "answer":   answer.strip(),
        })
        self._save_faqs()
        self._build_index()
        return True

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _category_emoji(category: str) -> str:
        mapping = {
            "Python Programming": "🐍",
            "Cloud Computing":    "☁️",
            "AI and Machine Learning": "🤖",
            "Linux":              "🐧",
            "Networking":         "🌐",
            "Cybersecurity":      "🔒",
            "Database & SQL":     "🗄️",
            "Web Development":    "🌍",
            "DevOps & CI/CD":     "🔧",
            "Git & Version Control": "📱",
        }
        return mapping.get(category, "💡")

    @staticmethod
    def _no_input_response() -> dict:
        return {
            "answer":           "Please type a question and I'll do my best to help! 😊",
            "confidence":       0,
            "category":         "",
            "matched_question": "",
            "suggestions":      [],
            "found":            False,
            "emoji":            "💬",
        }

    @staticmethod
    def _error_response() -> dict:
        return {
            "answer":           "Something went wrong processing your question. Please try again.",
            "confidence":       0,
            "category":         "",
            "matched_question": "",
            "suggestions":      [],
            "found":            False,
            "emoji":            "⚠️",
        }
