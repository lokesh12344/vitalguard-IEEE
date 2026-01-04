"""
AI Chat Router - Integrates Ollama LLM for health assistance
Provides diet recommendations, juice suggestions, and health queries
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json

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
