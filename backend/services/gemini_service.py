"""
Gemini API Service for MedVoice Companion
Handles all AI-powered medical document analysis
"""
import os
import base64
import google.generativeai as genai
from typing import Optional, List, Tuple
from dotenv import load_dotenv

load_dotenv()


class GeminiService:
    """Service for interacting with Google Gemini API"""
    
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.vision_model = genai.GenerativeModel('gemini-2.0-flash')
    
    def _get_system_prompt(self, simplify_level: int, language: str) -> str:
        """Generate system prompt based on settings"""
        simplicity = {
            1: "Use appropriate medical terminology. The user has medical background.",
            2: "Explain in simple, everyday language. Avoid jargon. Use analogies.",
            3: "Explain like talking to a child. Use very simple words and comparisons."
        }
        
        return f"""You are MedVoice Companion, a friendly and compassionate medical assistant.
Your role is to help patients understand their medical documents.

IMPORTANT GUIDELINES:
1. {simplicity.get(simplify_level, simplicity[2])}
2. Always be reassuring but honest
3. Never diagnose - only explain what the document says
4. Highlight anything that needs immediate attention
5. Suggest questions to ask the doctor
6. Respond in {language}

VOICE OUTPUT GUIDELINES:
- Use natural, conversational language
- Include pauses with commas for better TTS
- Avoid abbreviations (say "milligrams" not "mg")
- Numbers should be spoken naturally ("one hundred twenty" not "120")
"""

    async def analyze_text(
        self, 
        text: str, 
        document_type: str = "general",
        simplify_level: int = 2,
        language: str = "English"
    ) -> dict:
        """Analyze text-based medical content"""
        
        system_prompt = self._get_system_prompt(simplify_level, language)
        
        analysis_prompt = f"""{system_prompt}

Analyze this medical document and provide:
1. A brief summary (2-3 sentences)
2. A detailed explanation in simple terms
3. Key points the patient should know
4. Any warnings or concerns
5. Recommended next steps
6. A version of the explanation optimized for text-to-speech

DOCUMENT TYPE: {document_type}

DOCUMENT CONTENT:
{text}

Respond in this JSON format:
{{
    "summary": "brief summary",
    "explanation": "detailed simple explanation",
    "key_points": ["point 1", "point 2"],
    "warnings": ["warning 1"] or [],
    "next_steps": ["step 1", "step 2"],
    "audio_text": "TTS-optimized explanation with natural pauses"
}}
"""
        
        try:
            response = await self.model.generate_content_async(
                analysis_prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            
            import json
            result = json.loads(response.text)
            result["success"] = True
            result["document_type"] = document_type
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "summary": "Unable to analyze document",
                "explanation": f"An error occurred: {str(e)}",
                "key_points": [],
                "warnings": [],
                "next_steps": ["Please try again or contact support"],
                "audio_text": "I'm sorry, I couldn't analyze this document. Please try again."
            }

    async def analyze_image(
        self, 
        image_data: bytes,
        mime_type: str = "image/jpeg",
        document_type: str = "general",
        simplify_level: int = 2,
        language: str = "English"
    ) -> dict:
        """Analyze image-based medical content (lab results, prescriptions, etc.)"""
        
        system_prompt = self._get_system_prompt(simplify_level, language)
        
        analysis_prompt = f"""{system_prompt}

Look at this medical document image and provide:
1. A brief summary of what you see
2. A detailed explanation in simple terms
3. Key values or information the patient should know
4. Any warnings or abnormal findings
5. Recommended next steps
6. A version optimized for text-to-speech

DOCUMENT TYPE: {document_type}

If this is a lab result, also extract individual test values with their status (normal/high/low).

Respond in JSON format:
{{
    "summary": "brief summary",
    "explanation": "detailed simple explanation",
    "key_points": ["point 1", "point 2"],
    "lab_values": [
        {{"name": "test name", "value": "result", "unit": "unit", "reference_range": "range", "status": "normal/high/low", "explanation": "what this means"}}
    ] or null,
    "warnings": ["warning 1"] or [],
    "next_steps": ["step 1"],
    "audio_text": "TTS-optimized explanation"
}}
"""
        
        try:
            # Prepare image for Gemini
            image_part = {
                "mime_type": mime_type,
                "data": base64.b64encode(image_data).decode("utf-8")
            }
            
            response = await self.vision_model.generate_content_async(
                [analysis_prompt, image_part],
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            
            import json
            result = json.loads(response.text)
            result["success"] = True
            result["document_type"] = document_type
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "summary": "Unable to analyze image",
                "explanation": f"An error occurred: {str(e)}",
                "key_points": [],
                "warnings": [],
                "next_steps": ["Please try again with a clearer image"],
                "audio_text": "I'm sorry, I couldn't read this image. Please try again with a clearer photo."
            }

    async def answer_question(
        self,
        question: str,
        context: Optional[str] = None,
        language: str = "English"
    ) -> dict:
        """Answer a follow-up question about medical content"""
        
        prompt = f"""You are MedVoice Companion, a friendly medical assistant.
Answer this health-related question in simple, reassuring terms.
Always remind the user to consult their doctor for medical decisions.
Respond in {language}.

{"CONTEXT FROM PREVIOUS ANALYSIS:" + chr(10) + context if context else ""}

USER QUESTION: {question}

Respond in JSON format:
{{
    "answer": "your helpful answer",
    "audio_text": "TTS-optimized version of the answer",
    "follow_up_questions": ["suggested follow-up 1", "suggested follow-up 2"]
}}
"""
        
        try:
            response = await self.model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            
            import json
            result = json.loads(response.text)
            result["success"] = True
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "answer": "I'm sorry, I couldn't process your question.",
                "audio_text": "I'm sorry, I couldn't understand that question. Could you please try again?",
                "follow_up_questions": []
            }

    async def check_connection(self) -> bool:
        """Verify Gemini API connection"""
        try:
            response = await self.model.generate_content_async("Say 'connected'")
            return "connected" in response.text.lower()
        except:
            return False


# Singleton instance
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Get or create Gemini service instance"""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
