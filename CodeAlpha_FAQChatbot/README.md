# AI FAQ Chatbot — CodeAlpha Internship Task 2

An intelligent FAQ chatbot built with Python and Flask. It uses NLP techniques to understand user questions and return the most relevant answer from a knowledge base of 185 FAQs across 10 technical categories.

---

## Features

- NLP-powered question matching using TF-IDF and Cosine Similarity
- Handles greetings, small talk, and help requests naturally
- Synonym expansion (e.g. "ml" → machine learning, "k8s" → kubernetes)
- Confidence score shown with every response
- "Did you mean?" suggestions when no strong match is found
- 185 FAQs across 10 categories, with support to add your own
- Search bar to find FAQs by keyword
- Filter questions by category from the sidebar
- Save responses to a Favorites list
- Voice input (Speech-to-Text) and text-to-speech output
- Export chat history as TXT or JSON
- Dark and light theme with local storage persistence
- Glassmorphism UI with typing animation and auto-scroll
- Admin panel to add new FAQs without touching the codebase

---

## Tech Stack

- **Backend:** Python 3, Flask
- **NLP / AI:** NLTK (tokenization, stopwords, lemmatization), scikit-learn (TF-IDF, Cosine Similarity), NumPy
- **Frontend:** Bootstrap 5, Bootstrap Icons, Vanilla JavaScript
- **Design:** Glassmorphism, CSS custom properties, dark/light themes

---

## Project Structure

```
CodeAlpha_FAQChatbot/
├── app.py              # Flask routes and API endpoints
├── chatbot.py          # NLP engine (preprocessing, matching, response)
├── faq.json            # 185 FAQs across 10 categories
├── chat_history.json   # Auto-generated chat log
├── favorites.json      # Saved favorite responses
├── requirements.txt
├── run.bat             # One-click startup script (Windows)
├── README.md
├── templates/
│   └── index.html      # Main chat UI
└── static/
    ├── style.css
    └── script.js
```

---

## Getting Started

### Prerequisites

- Python 3.9 or higher
- pip

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/CodeAlpha_FAQChatbot.git
cd CodeAlpha_FAQChatbot

# 2. Create a virtual environment
python -m venv venv

# 3. Activate it
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run the app
python app.py
```

Then open your browser and go to `http://127.0.0.1:5000`

> On first run, NLTK will download its required data packages automatically. This takes about 10–15 seconds.

**Windows shortcut:** Just double-click `run.bat` — no need to activate the virtual environment manually.

---

## FAQ Categories

| Category | Questions |
|----------|-----------|
| Python Programming | 25 |
| AI and Machine Learning | 25 |
| Cloud Computing | 20 |
| Linux | 20 |
| Networking | 20 |
| Cybersecurity | 20 |
| Database & SQL | 15 |
| Web Development | 15 |
| DevOps & CI/CD | 15 |
| Git & Version Control | 10 |
| **Total** | **185** |

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Send message | `Enter` |
| New line in input | `Shift + Enter` |

---

## How the AI Matching Works

```
User Input
  → Preprocess (lowercase, synonym expansion, tokenize, remove stopwords, lemmatize)
  → TF-IDF Vectorization
  → Cosine Similarity against all 185 FAQ questions
  → Score ≥ 15%  →  Return best match with confidence score
  → Score < 15%  →  Return "Did you mean?" suggestions
```

---

## Author

Vidhan Rajvi 
CodeAlpha AI Internship — Task 2

---

## License

MIT
