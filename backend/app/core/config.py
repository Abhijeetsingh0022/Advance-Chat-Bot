"""
Application configuration settings
"""
try:
    from pydantic_settings import BaseSettings
    from typing import Optional

    class Settings(BaseSettings):
        # Database
        DATABASE_URL: str = "sqlite:///./chatbot.db"
        MONGO_URI: Optional[str] = None  # Optional - MongoDB for chat history
        
        # Security
        SECRET_KEY: str  # No default - must be set in environment
        ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
        
        # Email
        EMAIL__GMAIL_FROM_EMAIL: str
        EMAIL__GMAIL_APP_PASSWORD: str

        # AI Services
        AI_SERVICES__OPEN_ROUTER_API_KEY_XAI: str = ""
        AI_SERVICES__OPEN_ROUTER_API_KEY_DEEPSEEK: str = ""
        AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS: str = ""
        AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_CODER: str = ""
        AI_SERVICES__OPEN_ROUTER_API_KEY_GEMMA: str = ""
        AI_SERVICES__GROQ_API_KEY: str = ""
        AI_SERVICES__OPEN_ROUTER_API_KEY_1: str = ""
        AI_SERVICES__OPEN_ROUTER_API_KEY_2: str = ""
        AI_SERVICES__GEMINI_API_KEY: str = ""
        
        # OpenWeatherMap API Key
        OPENWEATHERMAP_API_KEY: str = ""

        # Rate Limiting
        RATE_LIMIT__GENERAL_REQUESTS_PER_MINUTE: int = 100
        RATE_LIMIT__CHAT_REQUESTS_PER_MINUTE: int = 10
        RATE_LIMIT__CHAT_WITH_FILES_REQUESTS_PER_MINUTE: int = 5
        RATE_LIMIT__USER_REQUESTS_PER_MINUTE: int = 60
        RATE_LIMIT__BULK_OPERATIONS_PER_MINUTE: int = 20
        REDIS_URL: Optional[str] = None

        # CORS
        FRONTEND_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
        
        # Base URL for email links and redirects
        BASE_URL: str = "http://localhost:8000"

        model_config = {"env_file": ".env", "extra": "ignore"}

        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            
            # Validate SECRET_KEY
            if not self.SECRET_KEY:
                raise ValueError("SECRET_KEY must be set in environment variables")
            if self.SECRET_KEY == "change-me" or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "SECRET_KEY is insecure. Please set a strong secret key "
                    "(at least 32 characters) in your .env file. "
                    "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
                )

    settings = Settings()
    print(f"[CONFIG] Using pydantic_settings")
    print(f"[CONFIG] SECRET_KEY loaded: {settings.SECRET_KEY[:30]}... (length: {len(settings.SECRET_KEY)})")
    print(f"[CONFIG] ALGORITHM: {settings.ALGORITHM}")
    
except Exception as e:
    print(f"[CONFIG] Pydantic settings failed: {e}")
    print(f"[CONFIG] Falling back to dotenv loader")
    # Fallback: simple env-based settings
    import os
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
        
    class Settings:
        DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./chatbot.db")
        MONGO_URI: str = os.getenv("MONGO_URI") # Optional
        SECRET_KEY: str = os.getenv("SECRET_KEY")  # No default - must be set
        ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
        ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        EMAIL__GMAIL_FROM_EMAIL: str = os.getenv("EMAIL__GMAIL_FROM_EMAIL")
        EMAIL__GMAIL_APP_PASSWORD: str = os.getenv("EMAIL__GMAIL_APP_PASSWORD")

        # AI Services
        AI_SERVICES__OPEN_ROUTER_API_KEY_XAI: str = os.getenv("AI_SERVICES__OPEN_ROUTER_API_KEY_XAI", "")
        AI_SERVICES__OPEN_ROUTER_API_KEY_DEEPSEEK: str = os.getenv("AI_SERVICES__OPEN_ROUTER_API_KEY_DEEPSEEK", "")
        AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS: str = os.getenv("AI_SERVICES__OPEN_ROUTER_API_KEY_GPT_OSS", "")
        AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_CODER: str = os.getenv("AI_SERVICES__OPEN_ROUTER_API_KEY_QWEN_CODER", "")
        AI_SERVICES__OPEN_ROUTER_API_KEY_GEMMA: str = os.getenv("AI_SERVICES__OPEN_ROUTER_API_KEY_GEMMA", "")
        AI_SERVICES__GROQ_API_KEY: str = os.getenv("AI_SERVICES__GROQ_API_KEY", "")
        AI_SERVICES__OPEN_ROUTER_API_KEY_1: str = os.getenv("AI_SERVICES__OPEN_ROUTER_API_KEY_1", "")
        AI_SERVICES__OPEN_ROUTER_API_KEY_2: str = os.getenv("AI_SERVICES__OPEN_ROUTER_API_KEY_2", "")
        AI_SERVICES__GEMINI_API_KEY: str = os.getenv("AI_SERVICES__GEMINI_API_KEY", "")
        
        # OpenWeatherMap API Key
        OPENWEATHERMAP_API_KEY: str = os.getenv("OPENWEATHERMAP_API_KEY", "")

        # Rate Limiting
        RATE_LIMIT__GENERAL_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT__GENERAL_REQUESTS_PER_MINUTE", "100"))
        RATE_LIMIT__CHAT_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT__CHAT_REQUESTS_PER_MINUTE", "10"))
        RATE_LIMIT__CHAT_WITH_FILES_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT__CHAT_WITH_FILES_REQUESTS_PER_MINUTE", "5"))
        RATE_LIMIT__USER_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT__USER_REQUESTS_PER_MINUTE", "60"))
        RATE_LIMIT__BULK_OPERATIONS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT__BULK_OPERATIONS_PER_MINUTE", "20"))
        REDIS_URL: str = os.getenv("REDIS_URL")
        
        FRONTEND_ORIGINS: str = os.getenv("FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
        
        # Base URL for email links and redirects
        BASE_URL: str = os.getenv("BASE_URL", "http://localhost:8000")

        def __init__(self):
            # Validate SECRET_KEY
            if not self.SECRET_KEY:
                raise ValueError("SECRET_KEY must be set in environment variables")
            if self.SECRET_KEY == "change-me" or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "SECRET_KEY is insecure. Please set a strong secret key "
                    "(at least 32 characters) in your .env file. "
                    "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
                )

    settings = Settings()
    print(f"[CONFIG-FALLBACK] Using fallback dotenv loader")
    print(f"[CONFIG-FALLBACK] SECRET_KEY: {settings.SECRET_KEY[:30] if settings.SECRET_KEY else 'None'}...")
    print(f"[CONFIG-FALLBACK] ALGORITHM: {settings.ALGORITHM}")
