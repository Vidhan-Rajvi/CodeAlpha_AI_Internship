@echo off
:: Batch file to run the Flask application using the project virtual environment
echo ==========================================
echo Starting AI FAQ Chatbot Pro...
echo ==========================================

IF NOT EXIST venv (
    echo [ERROR] Virtual environment 'venv' not found.
    echo Please create it first using: python -m venv venv
    pause
    exit /b
)

:: Run app.py using the python executable in the venv
"venv\Scripts\python.exe" app.py

pause
