# Language Translator — CodeAlpha Internship Task 1

A fast, responsive, and robust language translation web application. Built with Python, Flask, and the deep-translator library, it provides high-quality translations across 20 languages with a modern, glassmorphic user interface.

---

## Features

- **Multi-language Support:** Translate between 20 different languages with automatic source language detection.
- **Voice Integration:** Built-in Speech-to-Text for voice input and Text-to-Speech for audio output.
- **History & Favorites:** Automatically saves your last 100 translations. Star translations to keep them permanently in your Favorites list.
- **Export Capabilities:** Download your translation history as a CSV file or export individual translations as TXT files.
- **Modern UI:** Features a glassmorphism design with a responsive layout, dark/light theme toggling, and theme persistence via localStorage.
- **Keyboard Shortcuts:** Use `Ctrl + Enter` to quickly submit a translation.

---

## Tech Stack

- **Backend:** Python 3, Flask
- **Translation Engine:** deep-translator (Google Translate API)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Bootstrap 5
- **Design:** Custom CSS variables, Glassmorphism, Dark/Light modes

---

## Project Structure

```
CodeAlpha_LanguageTranslator/
├── app.py                  # Main Flask application and routes
├── requirements.txt        # Python dependencies
├── history.json            # Local storage for translation history
├── favorites.json          # Local storage for favorite translations
├── run.bat                 # Windows startup script
├── README.md
├── templates/
│   └── index.html          # Frontend UI template
└── static/
    ├── style.css           # Styling and themes
    └── script.js           # Client-side logic and API calls
```

---

## Getting Started

### Prerequisites

- Python 3.9 or higher
- pip (Python package installer)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/CodeAlpha_LanguageTranslator.git
   cd CodeAlpha_LanguageTranslator
   ```

2. **Set up a virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install the dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the application**
   
   If you are on Windows, you can simply run the provided batch script without needing to manually activate the virtual environment:
   ```cmd
   .\run.bat
   ```
   
   Alternatively, run it via Python:
   ```bash
   python app.py
   ```

   The application will start on port 5001. Open your web browser and navigate to `http://127.0.0.1:5001`.

---

## Supported Languages

English, Hindi, Gujarati, French, German, Spanish, Japanese, Chinese, Russian, Arabic, Portuguese, Italian, Korean, Dutch, Turkish, Polish, Swedish, Greek, Hebrew, Thai.

---

## Author

Vidhan Rajvi  
CodeAlpha AI Internship — Task 1

---

## License

MIT License
