"""
MedVoice Companion - FastAPI Backend
AI-powered medical document analysis with voice explanations
"""
import os
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import json

from .models import (
    AnalyzeRequest, AnalyzeResponse, 
    VoiceRequest, VoiceResponse,
    HealthCheckResponse, DocumentType, Language
)
from .services.gemini_service import get_gemini_service
from .services.tts_service import get_tts_service

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="MedVoice Companion",
    description="AI-powered medical document analysis with voice explanations",
    version="1.0.0"
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"


# Mount static files
if FRONTEND_DIR.exists():
    app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
    app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main application"""
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return HTMLResponse("<h1>MedVoice Companion</h1><p>Frontend not found. Run from project root.</p>")


@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Check API health and Gemini connection"""
    gemini = get_gemini_service()
    connected = await gemini.check_connection()
    
    return HealthCheckResponse(
        status="healthy" if connected else "degraded",
        version="1.0.0",
        gemini_connected=connected
    )


@app.post("/api/analyze/text", response_model=AnalyzeResponse)
async def analyze_text(request: AnalyzeRequest):
    """Analyze text-based medical content"""
    if not request.text:
        raise HTTPException(status_code=400, detail="No text provided")
    
    gemini = get_gemini_service()
    tts = get_tts_service()
    
    # Map language enum to full name
    language_map = {
        Language.ENGLISH: "English",
        Language.SPANISH: "Spanish",
        Language.FRENCH: "French",
        Language.ARABIC: "Arabic",
        Language.CHINESE: "Chinese"
    }
    
    result = await gemini.analyze_text(
        text=request.text,
        document_type=request.document_type.value,
        simplify_level=request.simplify_level,
        language=language_map.get(request.language, "English")
    )
    
    # Prepare audio text for TTS
    if result.get("audio_text"):
        result["audio_text"] = tts.prepare_for_tts(
            result["audio_text"], 
            request.language.value
        )
    
    return AnalyzeResponse(
        success=result.get("success", False),
        document_type=request.document_type,
        summary=result.get("summary", ""),
        explanation=result.get("explanation", ""),
        key_points=result.get("key_points", []),
        lab_values=result.get("lab_values"),
        warnings=result.get("warnings", []),
        next_steps=result.get("next_steps", []),
        audio_text=result.get("audio_text", "")
    )


@app.post("/api/analyze/image", response_model=AnalyzeResponse)
async def analyze_image(
    file: UploadFile = File(...),
    document_type: str = Form(default="general"),
    language: str = Form(default="en"),
    simplify_level: int = Form(default=2)
):
    """Analyze image-based medical documents"""
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/heic"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_types)}"
        )
    
    # Read image data
    image_data = await file.read()
    
    gemini = get_gemini_service()
    tts = get_tts_service()
    
    # Map language code to full name
    language_map = {
        "en": "English",
        "es": "Spanish",
        "fr": "French",
        "ar": "Arabic",
        "zh": "Chinese"
    }
    
    result = await gemini.analyze_image(
        image_data=image_data,
        mime_type=file.content_type,
        document_type=document_type,
        simplify_level=simplify_level,
        language=language_map.get(language, "English")
    )
    
    # Prepare audio text for TTS
    if result.get("audio_text"):
        result["audio_text"] = tts.prepare_for_tts(result["audio_text"], language)
    
    # Map document type string to enum
    try:
        doc_type = DocumentType(document_type)
    except:
        doc_type = DocumentType.GENERAL
    
    return AnalyzeResponse(
        success=result.get("success", False),
        document_type=doc_type,
        summary=result.get("summary", ""),
        explanation=result.get("explanation", ""),
        key_points=result.get("key_points", []),
        lab_values=result.get("lab_values"),
        warnings=result.get("warnings", []),
        next_steps=result.get("next_steps", []),
        audio_text=result.get("audio_text", "")
    )


@app.post("/api/ask", response_model=VoiceResponse)
async def ask_question(request: VoiceRequest):
    """Answer a follow-up question about medical content"""
    if not request.question:
        raise HTTPException(status_code=400, detail="No question provided")
    
    gemini = get_gemini_service()
    tts = get_tts_service()
    
    # Map language enum to full name
    language_map = {
        Language.ENGLISH: "English",
        Language.SPANISH: "Spanish",
        Language.FRENCH: "French", 
        Language.ARABIC: "Arabic",
        Language.CHINESE: "Chinese"
    }
    
    result = await gemini.answer_question(
        question=request.question,
        context=request.context,
        language=language_map.get(request.language, "English")
    )
    
    # Prepare audio text for TTS
    if result.get("audio_text"):
        result["audio_text"] = tts.prepare_for_tts(
            result["audio_text"],
            request.language.value
        )
    
    return VoiceResponse(
        success=result.get("success", False),
        answer=result.get("answer", ""),
        audio_text=result.get("audio_text", ""),
        follow_up_questions=result.get("follow_up_questions", [])
    )


@app.get("/api/tts/config")
async def get_tts_config(language: str = "en"):
    """Get TTS configuration for the specified language"""
    tts = get_tts_service()
    return tts.get_voice_config(language)


@app.get("/api/tts/voices")
async def get_tts_voices():
    """Get available TTS voices"""
    tts = get_tts_service()
    return tts.get_available_voices()


@app.post("/api/tts/speak")
async def speak_text(
    text: str = Form(...),
    language: str = Form(default="en"),
    voice: str = Form(default=None),
    rate: float = Form(default=0.9)
):
    """
    Synthesize speech from text using high-quality TTS
    Returns base64 encoded MP3 audio
    """
    tts = get_tts_service()
    
    # Try server-side TTS first
    result = await tts.synthesize_speech(
        text=text,
        language=language,
        voice=voice,
        speaking_rate=rate
    )
    
    if result:
        return result
    
    # Fallback: return config for browser TTS
    return {
        "success": False,
        "fallback": True,
        "text": tts.prepare_for_tts(text, language),
        "config": tts.get_voice_config(language),
        "message": "Server TTS unavailable, use browser TTS"
    }


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle unexpected errors gracefully"""
    return {
        "success": False,
        "error": "An unexpected error occurred",
        "detail": str(exc) if os.getenv("DEBUG", "false").lower() == "true" else None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "false").lower() == "true"
    )
