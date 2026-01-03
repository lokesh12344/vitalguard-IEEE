from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://vitalguard:vitalguard123@localhost:5432/vitalguard"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # JWT
    jwt_secret: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = "whatsapp:+14155238886"
    twilio_sms_from: str = ""  # Your Twilio SMS number
    whatsapp_content_sid: str = ""  # WhatsApp template content SID
    use_whatsapp_for_sos: bool = True  # Use WhatsApp instead of SMS for SOS
    
    # Alert settings
    alert_phone_numbers: str = ""
    
    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
