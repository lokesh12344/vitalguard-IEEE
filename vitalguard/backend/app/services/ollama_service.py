"""
Ollama LLM Service for VitalGuard Health Assistant
Provides health-related queries, diet suggestions, and wellness advice
"""
import httpx
import logging
import os
from typing import Optional, AsyncGenerator
import json

logger = logging.getLogger(__name__)

# Get Ollama configuration from environment
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3")

# System prompt for health assistant
HEALTH_ASSISTANT_PROMPT = """You are VitalGuard AI, a friendly and knowledgeable health assistant. Your role is to:

1. Answer basic to intermediate health-related queries
2. Provide diet recommendations based on diseases/conditions
3. Suggest healthy juices, smoothies, and natural remedies
4. Offer general wellness and lifestyle advice
5. Help users understand their health metrics

IMPORTANT GUIDELINES:
- Always remind users to consult healthcare professionals for serious conditions
- Never diagnose diseases - only provide general information
- Be empathetic and supportive in your responses
- Provide practical, actionable advice
- Include nutritional benefits when suggesting foods/drinks
- Keep responses concise but informative

When suggesting diets for conditions, include:
- Foods to eat and avoid
- Beneficial juices and drinks
- Meal timing suggestions
- Lifestyle modifications

You are integrated into VitalGuard, a remote patient monitoring system, so users may ask about vital signs like heart rate, blood pressure, oxygen levels, etc.
"""


class OllamaService:
    """Service for interacting with Ollama LLM"""
    
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = base_url or OLLAMA_BASE_URL
        self.model = model or OLLAMA_MODEL
        self.timeout = 120.0  # Longer timeout for LLM responses
        
    async def check_connection(self) -> tuple:
        """Check if Ollama server is running and return available models"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/tags", timeout=5.0)
                if response.status_code == 200:
                    data = response.json()
                    models = [model["name"] for model in data.get("models", [])]
                    return True, models
                return False, []
        except Exception as e:
            logger.error(f"Ollama connection error: {e}")
            return False, []
    
    async def get_available_models(self) -> list:
        """Get list of available models"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/tags", timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    return [model["name"] for model in data.get("models", [])]
        except Exception as e:
            logger.error(f"Error fetching models: {e}")
        return []
    
    async def chat(
        self, 
        message: str, 
        conversation_history: Optional[list] = None,
        context: Optional[str] = None
    ) -> str:
        """
        Send a chat message to Ollama and get response
        
        Args:
            message: User's message
            conversation_history: Previous messages for context
            context: Additional context (e.g., patient vitals)
        """
        messages = [{"role": "system", "content": HEALTH_ASSISTANT_PROMPT}]
        
        # Add context if provided (e.g., patient vital signs)
        if context:
            messages.append({
                "role": "system", 
                "content": f"Current patient context:\n{context}"
            })
        
        # Add conversation history
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": 0.7,
                            "top_p": 0.9,
                        }
                    },
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("message", {}).get("content", "I'm sorry, I couldn't generate a response.")
                else:
                    logger.error(f"Ollama API error: {response.status_code}")
                    return "I'm having trouble connecting to the AI service. Please try again later."
                    
        except httpx.TimeoutException:
            logger.error("Ollama request timed out")
            return "The request took too long. Please try asking a simpler question."
        except Exception as e:
            logger.error(f"Ollama chat error: {e}")
            return "I encountered an error. Please make sure Ollama is running and try again."
    
    async def stream_chat(
        self, 
        message: str, 
        conversation_history: Optional[list] = None,
        context: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response from Ollama
        
        Yields chunks of the response as they arrive
        """
        messages = [{"role": "system", "content": HEALTH_ASSISTANT_PROMPT}]
        
        if context:
            messages.append({
                "role": "system", 
                "content": f"Current patient context:\n{context}"
            })
        
        if conversation_history:
            messages.extend(conversation_history)
        
        messages.append({"role": "user", "content": message})
        
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": True,
                        "options": {
                            "temperature": 0.7,
                            "top_p": 0.9,
                        }
                    },
                    timeout=self.timeout
                ) as response:
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                content = data.get("message", {}).get("content", "")
                                if content:
                                    yield content
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            logger.error(f"Ollama stream error: {e}")
            yield "Error streaming response. Please try again."
    
    async def get_diet_recommendation(self, condition: str) -> str:
        """Get diet recommendations for a specific condition"""
        prompt = f"""Please provide a comprehensive diet recommendation for someone with {condition}. Include:

1. **Foods to Eat**: List beneficial foods with their nutritional benefits
2. **Foods to Avoid**: List foods that may worsen the condition
3. **Recommended Juices & Drinks**: 
   - Fresh juice recipes with ingredients
   - Herbal teas
   - Smoothie suggestions
4. **Sample Meal Plan**: A simple daily meal plan
5. **Lifestyle Tips**: Related lifestyle modifications

Please be specific and practical in your recommendations."""
        
        return await self.chat(prompt)
    
    async def get_juice_suggestions(self, health_goal: str) -> str:
        """Get juice and smoothie suggestions for a health goal"""
        prompt = f"""Suggest healthy juices and smoothies for: {health_goal}

For each suggestion, provide:
1. Name of the drink
2. Ingredients with quantities
3. Health benefits
4. Best time to consume
5. Any precautions

Include at least 3-5 different options with variety."""
        
        return await self.chat(prompt)
    
    async def explain_vital_sign(self, vital_type: str, value: float, unit: str) -> str:
        """Explain a vital sign reading to the user"""
        prompt = f"""A patient has a {vital_type} reading of {value} {unit}. Please explain:

1. What this vital sign measures
2. Whether this reading is normal, low, or high
3. What factors can affect this reading
4. General recommendations if the reading is abnormal
5. When to seek medical attention

Keep the explanation simple and easy to understand."""
        
        return await self.chat(prompt)


# Global instance
ollama_service = OllamaService()
