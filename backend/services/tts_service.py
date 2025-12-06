"""
Text-to-Speech Service for MedVoice Companion
Uses Gemini 2.5 TTS for high-quality voice output
"""
import os
import base64
import wave
import io
from typing import Optional, Dict
from enum import Enum


class TTSVoice(str, Enum):
    """Available Gemini TTS preset voices"""
    # From Google AI Studio - 30 available voices
    AOEDE = "Aoede"      # Bright, warm
    KORE = "Kore"        # Gentle, soothing - BEST FOR MEDICAL
    CHARON = "Charon"    # Calm, informative
    PUCK = "Puck"        # Clear, upbeat
    FENRIR = "Fenrir"    # Deep, authoritative
    LEDA = "Leda"        # Friendly, conversational


class TTSService:
    """Service for high-quality Text-to-Speech using Gemini 2.5"""
    
    # Common medical abbreviations to expand for TTS
    ABBREVIATIONS = {
        "mg": "milligrams",
        "ml": "milliliters",
        "mcg": "micrograms",
        "kg": "kilograms",
        "mmHg": "millimeters of mercury",
        "bpm": "beats per minute",
        "mg/dL": "milligrams per deciliter",
        "mmol/L": "millimoles per liter",
        "g/dL": "grams per deciliter",
        "K/uL": "thousand per microliter",
        "M/uL": "million per microliter",
        "WBC": "white blood cell count",
        "RBC": "red blood cell count",
        "Hgb": "hemoglobin",
        "PLT": "platelet count",
        "LDL": "L D L cholesterol",
        "HDL": "H D L cholesterol",
        "BP": "blood pressure",
        "BMI": "body mass index",
        "BID": "twice daily",
        "TID": "three times daily",
        "QD": "once daily",
        "PRN": "as needed",
        "Rx": "prescription",
    }
    
    def __init__(self):
        self.gemini_tts_available = False
        self.client = None
        self._init_gemini_tts()
    
    def _init_gemini_tts(self):
        """Initialize Gemini TTS using the official google.genai client"""
        try:
            from google import genai
            
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                print("⚠️ GEMINI_API_KEY not found, using browser TTS fallback")
                return
            
            # Initialize client with API key
            self.client = genai.Client(api_key=api_key)
            self.gemini_tts_available = True
            print("✅ Gemini 2.5 TTS initialized successfully")
                
        except ImportError as e:
            print(f"⚠️ google-genai not installed: {e}")
            print("   Run: pip install google-genai")
        except Exception as e:
            print(f"⚠️ Gemini TTS init error: {e}")
    
    def prepare_for_tts(self, text: str, language: str = "en") -> str:
        """Prepare text for optimal TTS output"""
        import re
        result = text
        
        # Expand abbreviations
        for abbr, expansion in self.ABBREVIATIONS.items():
            result = re.sub(
                rf'\b{re.escape(abbr)}\b',
                expansion,
                result,
                flags=re.IGNORECASE
            )
        
        return result
    
    async def synthesize_speech(
        self, 
        text: str, 
        language: str = "en",
        voice: str = None,
        speaking_rate: float = 0.9
    ) -> Optional[Dict]:
        """
        Synthesize speech using Gemini 2.5 TTS
        Returns base64 encoded WAV audio
        """
        if not self.gemini_tts_available or not self.client:
            return None
        
        try:
            from google.genai import types
            
            # Prepare text with expanded abbreviations
            prepared_text = self.prepare_for_tts(text, language)
            
            # Select voice (Kore is gentle and soothing - good for medical)
            voice_name = voice or TTSVoice.KORE.value
            
            # Generate speech using official Gemini TTS API
            response = self.client.models.generate_content(
                model="gemini-2.5-flash-preview-tts",
                contents=prepared_text,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=voice_name,
                            )
                        )
                    ),
                )
            )
            
            # Extract audio data from response
            if response.candidates and response.candidates[0].content.parts:
                part = response.candidates[0].content.parts[0]
                if hasattr(part, 'inline_data') and part.inline_data:
                    audio_data = part.inline_data.data
                    
                    # The audio is raw PCM, need to wrap in WAV format
                    wav_buffer = io.BytesIO()
                    with wave.open(wav_buffer, 'wb') as wf:
                        wf.setnchannels(1)
                        wf.setsampwidth(2)
                        wf.setframerate(24000)
                        wf.writeframes(audio_data)
                    
                    wav_data = wav_buffer.getvalue()
                    audio_base64 = base64.b64encode(wav_data).decode('utf-8')
                    
                    return {
                        "success": True,
                        "audio": audio_base64,
                        "format": "wav",
                        "voice": voice_name,
                        "language": language
                    }
            
            print("No audio data in Gemini response")
            return None
            
        except Exception as e:
            print(f"Gemini TTS synthesis error: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_voice_config(self, language: str = "en") -> Dict:
        """Get TTS configuration"""
        lang_codes = {
            "en": "en-US",
            "es": "es-US",
            "fr": "fr-FR",
            "ar": "ar-EG",
            "zh": "zh-CN"
        }
        return {
            "lang": lang_codes.get(language, "en-US"),
            "voice": TTSVoice.KORE.value,
            "rate": 0.9,
            "pitch": 1.0,
            "volume": 1.0,
            "useServerTTS": self.gemini_tts_available
        }
    
    def get_available_voices(self) -> Dict:
        """Get list of available Gemini TTS voices"""
        return {
            "server_tts_available": self.gemini_tts_available,
            "engine": "Gemini 2.5 Flash TTS" if self.gemini_tts_available else "Browser Web Speech API",
            "voices": {
                "kore": "Kore (Gentle, soothing - recommended)",
                "aoede": "Aoede (Bright, warm)",
                "charon": "Charon (Calm, informative)",
                "puck": "Puck (Clear, upbeat)",
                "fenrir": "Fenrir (Deep, authoritative)",
                "leda": "Leda (Friendly, conversational)",
            },
            "languages": ["en", "es", "fr", "ar", "de", "it", "ja", "ko", "pt", "ru"]
        }


# Singleton instance
_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    """Get or create TTS service instance"""
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
