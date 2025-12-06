@echo off
echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║     MedVoice Companion - AI Health Assistant       ║
echo  ║     Powered by Gemini 2.0 Flash + Gemini TTS      ║
echo  ╚═══════════════════════════════════════════════════╝
echo.

:: Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate virtual environment
call venv\Scripts\activate

:: Install dependencies
echo Installing dependencies...
pip install -r requirements.txt -q

:: Check for .env file
if not exist ".env" (
    echo.
    echo WARNING: .env file not found!
    echo Please copy .env.example to .env and add your GEMINI_API_KEY
    echo.
    copy .env.example .env
    echo Created .env from template. Please edit it with your API key.
    notepad .env
    pause
)

:: Start the server
echo.
echo Starting MedVoice Companion...
echo Open http://localhost:8000 in your browser
echo.
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
