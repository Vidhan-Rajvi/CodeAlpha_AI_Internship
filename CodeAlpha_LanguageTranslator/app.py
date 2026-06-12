from flask import Flask, render_template, request, redirect, jsonify, send_file
from deep_translator import GoogleTranslator, single_detection
import json
import os
import csv
import io
from datetime import datetime

app = Flask(__name__)

# ─── Language List with Flag Emojis ───────────────────────────────────────────
LANGUAGES = {
    "Auto Detect":  "auto",
    "English":      {"code": "en",    "flag": "🇬🇧"},
    "Hindi":        {"code": "hi",    "flag": "🇮🇳"},
    "Gujarati":     {"code": "gu",    "flag": "🇮🇳"},
    "French":       {"code": "fr",    "flag": "🇫🇷"},
    "German":       {"code": "de",    "flag": "🇩🇪"},
    "Spanish":      {"code": "es",    "flag": "🇪🇸"},
    "Japanese":     {"code": "ja",    "flag": "🇯🇵"},
    "Chinese":      {"code": "zh-CN", "flag": "🇨🇳"},
    "Russian":      {"code": "ru",    "flag": "🇷🇺"},
    "Arabic":       {"code": "ar",    "flag": "🇸🇦"},
    "Portuguese":   {"code": "pt",    "flag": "🇧🇷"},
    "Italian":      {"code": "it",    "flag": "🇮🇹"},
    "Korean":       {"code": "ko",    "flag": "🇰🇷"},
    "Dutch":        {"code": "nl",    "flag": "🇳🇱"},
    "Turkish":      {"code": "tr",    "flag": "🇹🇷"},
    "Polish":       {"code": "pl",    "flag": "🇵🇱"},
    "Swedish":      {"code": "sv",    "flag": "🇸🇪"},
    "Greek":        {"code": "el",    "flag": "🇬🇷"},
    "Hebrew":       {"code": "iw",    "flag": "🇮🇱"},
    "Thai":         {"code": "th",    "flag": "🇹🇭"},
}

HISTORY_FILE  = "history.json"
FAVORITES_FILE = "favorites.json"


# ─── File Helpers ──────────────────────────────────────────────────────────────
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
        json.dump(data, f, indent=4, ensure_ascii=False)


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.route("/", methods=["GET", "POST"])
def index():
    translated_text  = ""
    detected_lang    = ""
    error            = ""
    history          = load_json(HISTORY_FILE)
    favorites        = load_json(FAVORITES_FILE)
    search_query     = request.args.get("search", "").lower()

    if search_query:
        history = [
            h for h in history
            if search_query in h.get("source_text", "").lower()
            or search_query in h.get("translated_text", "").lower()
        ]

    if request.method == "POST":
        # Support both JSON (AJAX) and form submissions
        if request.headers.get('Content-Type') == 'application/json' or request.is_json:
            data = request.get_json() or {}
            text = data.get("text", "").strip()
            source = data.get("source", "auto")
            target = data.get("target", "en")
        else:
            text   = request.form.get("text", "").strip()
            source = request.form.get("source", "auto")
            target = request.form.get("target", "en")

        if not text:
            error = "Please enter text to translate."
        else:
            try:
                translator = GoogleTranslator(source=source, target=target)
                translated_text = translator.translate(text)

                # detect language name for display
                detected_lang = source if source != "auto" else "auto"

                entry = {
                    "id":               datetime.now().strftime("%Y%m%d%H%M%S%f"),
                    "date":             datetime.now().strftime("%d %b %Y, %H:%M"),
                    "source_text":      text,
                    "translated_text":  translated_text,
                    "source_lang":      source,
                    "target_lang":      target,
                    "favorited":        False,
                }
                all_history = load_json(HISTORY_FILE)
                all_history.insert(0, entry)
                save_json(HISTORY_FILE, all_history[:100])   # keep last 100
                history = all_history

            except Exception as e:
                error = f"Translation failed: {str(e)}"

        if request.headers.get('Content-Type') == 'application/json' or request.is_json:
            if error:
                return jsonify({"success": False, "error": error}), 400
            return jsonify({
                "success": True,
                "translated_text": translated_text,
                "detected_lang": detected_lang,
                "history": history,
                "favorites": favorites,
                "count": len(load_json(HISTORY_FILE))
            })

    return render_template(
        "index.html",
        languages=LANGUAGES,
        translated_text=translated_text,
        detected_lang=detected_lang,
        history=history,
        favorites=favorites,
        count=len(load_json(HISTORY_FILE)),
        error=error,
        search_query=search_query,
        target_lang=request.form.get("target", "en") if request.method == "POST" else "en"
    )


@app.route("/clear", methods=["POST"])
def clear_history():
    save_json(HISTORY_FILE, [])
    if request.headers.get('Content-Type') == 'application/json' or request.is_json:
        return jsonify({
            "success": True,
            "count": 0,
            "history": [],
            "favorites": load_json(FAVORITES_FILE)
        })
    return redirect("/")


@app.route("/favorite/<item_id>", methods=["POST"])
def toggle_favorite(item_id):
    favorites = load_json(FAVORITES_FILE)
    history = load_json(HISTORY_FILE)
    
    # Check if already in favorites
    fav_ids = [f["id"] for f in favorites]
    if item_id in fav_ids:
        # Remove from favorites
        favorites = [f for f in favorites if f["id"] != item_id]
    else:
        # Add to favorites. Find item in history
        item_to_add = None
        for item in history:
            if item.get("id") == item_id:
                item_to_add = item
                break
        if item_to_add:
            favorites.insert(0, item_to_add)
            
    save_json(FAVORITES_FILE, favorites)
    
    if request.headers.get('Content-Type') == 'application/json' or request.is_json:
        return jsonify({
            "success": True,
            "favorites": favorites,
            "history": history
        })
    return redirect("/")


@app.route("/delete/<item_id>", methods=["POST"])
def delete_history(item_id):
    history = load_json(HISTORY_FILE)
    favorites = load_json(FAVORITES_FILE)
    
    history = [item for item in history if item.get("id") != item_id]
    save_json(HISTORY_FILE, history)
    
    favorites = [item for item in favorites if item.get("id") != item_id]
    save_json(FAVORITES_FILE, favorites)
    
    if request.headers.get('Content-Type') == 'application/json' or request.is_json:
        return jsonify({
            "success": True,
            "count": len(history),
            "favorites": favorites,
            "history": history
        })
    return redirect("/")


@app.route("/export/csv")
def export_csv():
    history = load_json(HISTORY_FILE)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Source Text", "Translated Text", "Source Lang", "Target Lang"])
    for item in history:
        writer.writerow([
            item.get("date", ""),
            item.get("source_text", ""),
            item.get("translated_text", ""),
            item.get("source_lang", ""),
            item.get("target_lang", ""),
        ])
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        mimetype="text/csv",
        as_attachment=True,
        download_name="translation_history.csv",
    )


@app.route("/export/txt", methods=["POST"])
def export_txt():
    text = request.form.get("text", "")
    return send_file(
        io.BytesIO(text.encode("utf-8")),
        mimetype="text/plain",
        as_attachment=True,
        download_name="translation.txt",
    )


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5001)
