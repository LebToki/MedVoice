# MedVoice Companion

> 🏥 AI-Powered Health Assistant that translates medical reports into simple voice explanations

[![Gemini API](https://img.shields.io/badge/Powered%20by-Gemini%20API-blue)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🎯 The Problem

Millions of patients struggle to understand their medical reports, lab results, and prescriptions. This leads to medication non-compliance, anxiety, and health disparities.

## 💡 The Solution

**MedVoice Companion** uses Google Gemini's multimodal AI to:
- 📄 **Analyze** medical documents (PDFs, images, text)
- 🗣️ **Explain** results in simple, spoken language
- 👴 **Assist** elderly and visually impaired users via voice
- 🌍 **Translate** explanations to multiple languages


## Screenshots
<img width="1920" height="869" alt="main_app" src="https://github.com/user-attachments/assets/b6243ede-6245-43f5-bf1f-ab6fa4ba57eb" />
<img width="1920" height="869" alt="upload_section" src="https://github.com/user-attachments/assets/96146ea6-e44f-472d-ae2f-31c26ac1dadb" />
<img width="1920" height="869" alt="hero_section" src="https://github.com/user-attachments/assets/1d4a72eb-fd18-49f9-8064-ad44606937fa" />
<img width="1920" height="869" alt="analysis_results" src="https://github.com/user-attachments/assets/34c8550b-f81a-4188-887f-a086acb80db5" />



## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ (optional, for development)
- Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/medvoice-companion.git
cd medvoice-companion

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run the application
python -m uvicorn backend.main:app --reload --port 8000
```

### Open the App
Navigate to `http://localhost:8000` in your browser.

## 🏗️ Architecture

```
MedVoice Companion
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Pydantic schemas
│   └── services/
│       ├── gemini_service.py    # Gemini API integration
│       └── tts_service.py       # Text-to-Speech service
├── frontend/
│   ├── index.html           # Main application
│   ├── css/styles.css       # Glassmorphic UI
│   └── js/app.js            # Application logic
└── requirements.txt
```

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📋 Medical Report Reader | Upload PDFs/images, get simple explanations |
| 🧪 Lab Result Interpreter | Understand what your blood tests mean |
| 💊 Medication Explainer | Learn about your prescriptions |
| 🎙️ Voice Assistant | Hands-free interaction |
| ♿ Accessibility | High contrast, large text, screen reader support |

## 🔒 Privacy

- All processing is done securely via Gemini API
- No medical data is stored permanently
- User consent is required for all operations

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.

---

**Built with ❤️ for the Gemini 3 Vibe Coding Hackathon by Tarek Tarabichi from 2TInteractive.com**
