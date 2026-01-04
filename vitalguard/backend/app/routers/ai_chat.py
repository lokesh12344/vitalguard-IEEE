"""
AI Chat Router - Integrates Ollama LLM for health assistance
Provides diet recommendations, juice suggestions, and health queries
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import fitz  # PyMuPDF for PDF processing

from app.services.ollama_service import OllamaService

router = APIRouter(prefix="/ai-chat", tags=["AI Chat"])

# Initialize Ollama service
ollama_service = OllamaService()


# Request/Response Models
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []


class DietRequest(BaseModel):
    condition: str
    preferences: Optional[str] = None
    restrictions: Optional[str] = None


class JuiceRequest(BaseModel):
    condition: str
    preferences: Optional[str] = None


class VitalExplainRequest(BaseModel):
    vital_type: str
    value: float
    unit: str
    is_abnormal: bool = False


class ChatResponse(BaseModel):
    response: str
    model: str


class StatusResponse(BaseModel):
    connected: bool
    models: List[str]
    current_model: str
    message: str


# Endpoints
@router.get("/status", response_model=StatusResponse)
async def get_status():
    """Check AI service connection status"""
    try:
        is_connected, models = await ollama_service.check_connection()
        
        if is_connected:
            return StatusResponse(
                connected=True,
                models=models,
                current_model=ollama_service.model,
                message="Ollama is running and ready"
            )
        else:
            return StatusResponse(
                connected=False,
                models=[],
                current_model=ollama_service.model,
                message="Ollama service is not available"
            )
    except Exception as e:
        return StatusResponse(
            connected=False,
            models=[],
            current_model=ollama_service.model,
            message=f"Error checking connection: {str(e)}"
        )


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """Send a message to the AI assistant"""
    try:
        # Convert conversation history to the format expected by Ollama
        history = []
        for msg in request.conversation_history:
            history.append({
                "role": msg.role,
                "content": msg.content
            })
        
        response = await ollama_service.chat(
            message=request.message,
            conversation_history=history
        )
        
        return ChatResponse(
            response=response,
            model=ollama_service.model
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get AI response: {str(e)}"
        )


@router.post("/stream")
async def stream_message(request: ChatRequest):
    """Stream a response from the AI assistant"""
    try:
        history = []
        for msg in request.conversation_history:
            history.append({
                "role": msg.role,
                "content": msg.content
            })
        
        async def generate():
            async for chunk in ollama_service.stream_chat(
                message=request.message,
                conversation_history=history
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stream AI response: {str(e)}"
        )


@router.post("/diet-recommendation")
async def get_diet_recommendation(request: DietRequest):
    """Get personalized diet recommendations based on health condition"""
    try:
        recommendation = await ollama_service.get_diet_recommendation(
            condition=request.condition,
            preferences=request.preferences,
            restrictions=request.restrictions
        )
        
        return {
            "condition": request.condition,
            "recommendation": recommendation,
            "model": ollama_service.model
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get diet recommendation: {str(e)}"
        )


@router.post("/juice-suggestions")
async def get_juice_suggestions(request: JuiceRequest):
    """Get healthy juice suggestions based on health condition"""
    try:
        suggestions = await ollama_service.get_juice_suggestions(
            condition=request.condition,
            preferences=request.preferences
        )
        
        return {
            "condition": request.condition,
            "suggestions": suggestions,
            "model": ollama_service.model
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get juice suggestions: {str(e)}"
        )


@router.post("/explain-vital")
async def explain_vital_sign(request: VitalExplainRequest):
    """Get an explanation of a vital sign reading"""
    try:
        explanation = await ollama_service.explain_vital_sign(
            vital_type=request.vital_type,
            value=request.value,
            unit=request.unit,
            is_abnormal=request.is_abnormal
        )
        
        return {
            "vital_type": request.vital_type,
            "value": request.value,
            "unit": request.unit,
            "explanation": explanation,
            "model": ollama_service.model
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to explain vital sign: {str(e)}"
        )


@router.get("/health-tips")
async def get_health_tips(topic: Optional[str] = "general wellness"):
    """Get health tips on a specific topic"""
    try:
        prompt = f"""As a health assistant, provide 5 practical health tips about {topic}.
        
        Format your response as a numbered list with brief explanations.
        Keep each tip concise and actionable.
        Focus on evidence-based advice that can be easily implemented in daily life.
        
        Important: This is general information only. Always recommend consulting a healthcare provider for personalized medical advice."""
        
        response = await ollama_service.chat(message=prompt)
        
        return {
            "topic": topic,
            "tips": response,
            "model": ollama_service.model
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get health tips: {str(e)}"
        )


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text content from a PDF file."""
    text_content = []
    
    try:
        # Open PDF from bytes
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                text_content.append(f"--- Page {page_num + 1} ---\n{text}")
        
        doc.close()
        return "\n\n".join(text_content)
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")


@router.post("/analyze-report")
async def analyze_medical_report(file: UploadFile = File(...)):
    """
    Upload a PDF medical report and get an AI-powered explanation in simple language.
    The AI will analyze the report and explain it in easy-to-understand terms.
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported. Please upload a PDF file."
        )
    
    # Check file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size too large. Maximum allowed size is 10MB."
        )
    
    try:
        # Extract text from PDF
        extracted_text = extract_text_from_pdf(contents)
        
        if not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract any text from the PDF. The file might be scanned or image-based."
            )
        
        # Truncate if too long (keep first 8000 chars for context window)
        if len(extracted_text) > 8000:
            extracted_text = extracted_text[:8000] + "\n\n[... Report truncated for analysis ...]"
        
        # Create prompt for AI analysis
        analysis_prompt = f"""You are a helpful medical assistant. A patient has uploaded their medical test report and needs help understanding it.

IMPORTANT GUIDELINES:
1. Explain the report in SIMPLE, EASY-TO-UNDERSTAND language that anyone can understand
2. Avoid complex medical jargon - if you must use medical terms, explain them simply
3. Highlight the KEY FINDINGS - what's normal and what needs attention
4. Use bullet points and clear sections for readability
5. Be reassuring but honest about any concerning findings
6. Always recommend discussing results with their doctor for proper medical advice
7. Do NOT diagnose or prescribe - only explain what the values mean

Here is the medical report content:

{extracted_text}

Please provide:
1. 📋 **Report Summary** - What type of test is this and what does it check for?
2. ✅ **Normal Results** - Which values are in the healthy range?
3. ⚠️ **Values to Note** - Any values that are outside normal range (explain what they mean in simple terms)
4. 💡 **What This Means** - A simple explanation of the overall findings
5. 👨‍⚕️ **Next Steps** - General advice (always emphasizing to consult their doctor)

Remember: Explain like you're talking to someone with no medical background."""

        # Get AI response
        response = await ollama_service.chat(message=analysis_prompt)
        
        return {
            "filename": file.filename,
            "analysis": response,
            "model": ollama_service.model,
            "pages_analyzed": extracted_text.count("--- Page"),
            "message": "Report analyzed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze report: {str(e)}"
        )
