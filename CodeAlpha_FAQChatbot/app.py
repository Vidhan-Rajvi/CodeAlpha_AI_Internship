"""
app.py — Flask Backend
CodeAlpha FAQ Chatbot Pro
"""

import json
import io
import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, send_file
from chatbot import FAQChatbot

app = Flask(__name__)

# ── Init chatbot once on startup ──────────────────────────────────────────────
bot = FAQChatbot(faq_path="faq.json")

CHAT_HISTORY_FILE = "chat_history.json"
FAVORITES_FILE    = "favorites.json"


# ── File helpers ──────────────────────────────────────────────────────────────
def load_json(path):
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    categories        = bot.get_categories()
    suggested         = bot.get_suggested_questions(6)
    total_faqs        = len(bot.faqs)
    history           = load_json(CHAT_HISTORY_FILE)
    favorites         = load_json(FAVORITES_FILE)

    # Stats for dashboard
    total_questions   = sum(1 for m in history if m.get("role") == "user")
    avg_confidence    = 0
    bot_msgs          = [m for m in history if m.get("role") == "bot" and m.get("confidence", 0) > 0]
    if bot_msgs:
        avg_confidence = round(sum(m["confidence"] for m in bot_msgs) / len(bot_msgs), 1)

    return render_template(
        "index.html",
        categories=categories,
        suggested=suggested,
        total_faqs=total_faqs,
        total_questions=total_questions,
        avg_confidence=avg_confidence,
        favorites_count=len(favorites),
        history=history[-50:],   # last 50 messages for display
    )


@app.route("/chat", methods=["POST"])
def chat():
    data            = request.get_json(force=True)
    user_input      = data.get("message", "").strip()
    category_filter = data.get("category", "All")

    if not user_input:
        return jsonify({"error": "Empty message"}), 400

    response = bot.get_response(user_input, category_filter)

    # Persist to history
    history = load_json(CHAT_HISTORY_FILE)
    timestamp = datetime.now().strftime("%d %b %Y, %H:%M")

    history.append({
        "role":      "user",
        "text":      user_input,
        "timestamp": timestamp,
    })
    history.append({
        "role":             "bot",
        "text":             response["answer"],
        "timestamp":        timestamp,
        "confidence":       response["confidence"],
        "category":         response["category"],
        "matched_question": response["matched_question"],
        "suggestions":      response["suggestions"],
        "found":            response["found"],
        "emoji":            response["emoji"],
    })

    save_json(CHAT_HISTORY_FILE, history[-200:])   # keep last 200 messages

    return jsonify(response)


@app.route("/search")
def search():
    query   = request.args.get("q", "").strip()
    results = bot.search_faqs(query) if query else []
    return jsonify({"results": results, "count": len(results)})


@app.route("/faqs")
def get_faqs():
    category = request.args.get("category", "")
    if category and category != "All":
        data = bot.get_faqs_by_category(category)
    else:
        data = bot.faqs
    return jsonify({"faqs": data, "count": len(data)})


@app.route("/favorite", methods=["POST"])
def toggle_favorite():
    data      = request.get_json(force=True)
    question  = data.get("question", "").strip()
    answer    = data.get("answer", "").strip()
    favorites = load_json(FAVORITES_FILE)

    existing  = [f for f in favorites if f.get("question") == question]
    if existing:
        favorites = [f for f in favorites if f.get("question") != question]
        action = "removed"
    else:
        favorites.insert(0, {
            "question":  question,
            "answer":    answer,
            "saved_at":  datetime.now().strftime("%d %b %Y, %H:%M"),
        })
        action = "added"

    save_json(FAVORITES_FILE, favorites)
    return jsonify({"action": action, "count": len(favorites)})


@app.route("/favorites")
def get_favorites():
    favorites = load_json(FAVORITES_FILE)
    return jsonify({"favorites": favorites})


@app.route("/add_faq", methods=["POST"])
def add_faq():
    data     = request.get_json(force=True)
    category = data.get("category", "").strip()
    question = data.get("question", "").strip()
    answer   = data.get("answer", "").strip()

    if not all([category, question, answer]):
        return jsonify({"success": False, "error": "All fields are required"}), 400

    try:
        bot.add_faq(category, question, answer)
        return jsonify({"success": True, "total": len(bot.faqs)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/chat/clear", methods=["POST"])
def clear_chat():
    save_json(CHAT_HISTORY_FILE, [])
    return jsonify({"success": True})


@app.route("/export/txt")
def export_txt():
    history = load_json(CHAT_HISTORY_FILE)
    lines   = [f"AI FAQ Chatbot — Export\nGenerated: {datetime.now().strftime('%d %b %Y, %H:%M')}\n{'='*60}\n"]
    for msg in history:
        role  = "You" if msg["role"] == "user" else "AI Bot"
        lines.append(f"[{msg.get('timestamp','')}] {role}:\n{msg['text']}\n")
        if msg["role"] == "bot" and msg.get("confidence", 0) > 0:
            lines.append(f"  (Confidence: {msg['confidence']}% | Category: {msg.get('category','')})\n")
        lines.append("")
    content = "\n".join(lines)
    return send_file(
        io.BytesIO(content.encode("utf-8")),
        mimetype="text/plain",
        as_attachment=True,
        download_name="chat_history.txt",
    )


@app.route("/export/json")
def export_json():
    history = load_json(CHAT_HISTORY_FILE)
    content = json.dumps({"exported_at": datetime.now().isoformat(), "messages": history}, indent=2, ensure_ascii=False)
    return send_file(
        io.BytesIO(content.encode("utf-8")),
        mimetype="application/json",
        as_attachment=True,
        download_name="chat_history.json",
    )


@app.route("/stats")
def stats():
    history  = load_json(CHAT_HISTORY_FILE)
    favs     = load_json(FAVORITES_FILE)
    user_msgs = [m for m in history if m.get("role") == "user"]
    bot_msgs  = [m for m in history if m.get("role") == "bot"]
    answered  = [m for m in bot_msgs if m.get("found")]
    return jsonify({
        "total_questions":  len(user_msgs),
        "total_faqs":       len(bot.faqs),
        "categories":       len(bot.get_categories()),
        "favorites_count":  len(favs),
        "answered":         len(answered),
        "unanswered":       len(bot_msgs) - len(answered),
    })


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True)
