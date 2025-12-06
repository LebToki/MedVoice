"""
Pydantic models for MedVoice Companion API
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class DocumentType(str, Enum):
    """Types of medical documents supported"""
    LAB_RESULT = "lab_result"
    PRESCRIPTION = "prescription"
    MEDICAL_REPORT = "medical_report"
    IMAGING = "imaging"
    GENERAL = "general"


class Language(str, Enum):
    """Supported languages for explanations"""
    ENGLISH = "en"
    SPANISH = "es"
    FRENCH = "fr"
    ARABIC = "ar"
    CHINESE = "zh"


class AnalyzeRequest(BaseModel):
    """Request model for document analysis"""
    text: Optional[str] = Field(None, description="Text content to analyze")
    document_type: DocumentType = Field(
        DocumentType.GENERAL, 
        description="Type of medical document"
    )
    language: Language = Field(
        Language.ENGLISH, 
        description="Language for explanation"
    )
    simplify_level: int = Field(
        2, 
        ge=1, 
        le=3, 
        description="1=Technical, 2=Simple, 3=Very Simple"
    )


class LabValue(BaseModel):
    """A single lab test value"""
    name: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: Optional[str] = None  # normal, high, low, critical
    explanation: Optional[str] = None


class AnalyzeResponse(BaseModel):
    """Response model for document analysis"""
    success: bool
    document_type: DocumentType
    summary: str = Field(..., description="Brief summary of the document")
    explanation: str = Field(..., description="Detailed simple explanation")
    key_points: List[str] = Field(default_factory=list, description="Key takeaways")
    lab_values: Optional[List[LabValue]] = None
    warnings: List[str] = Field(default_factory=list, description="Important alerts")
    next_steps: List[str] = Field(default_factory=list, description="Recommended actions")
    audio_text: str = Field(..., description="Text optimized for TTS")


class VoiceRequest(BaseModel):
    """Request for voice-based interaction"""
    audio_text: Optional[str] = None
    question: Optional[str] = None
    context: Optional[str] = None
    language: Language = Language.ENGLISH


class VoiceResponse(BaseModel):
    """Response for voice interaction"""
    success: bool
    answer: str
    audio_text: str
    follow_up_questions: List[str] = Field(default_factory=list)


class HealthCheckResponse(BaseModel):
    """API health check response"""
    status: str
    version: str
    gemini_connected: bool
