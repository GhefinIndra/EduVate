import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # PostgreSQL Database Configuration (Supabase)
    DATABASE_URL: str
    
    # Gemini API Configuration
    GEMINI_API_KEY: str
    
    # JWT Authentication Configuration
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    
    # ChromaDB Configuration
    CHROMA_PATH: str
    
    # Upload Configuration
    UPLOAD_DIR: str
    MAX_FILE_SIZE_MB: int

    # Google Cloud Storage Configuration
    GCS_BUCKET_NAME: str = "eduvate-documents"

    # Redis Cache Configuration (Upstash)
    UPSTASH_REDIS_REST_URL: str = os.getenv("UPSTASH_REDIS_REST_URL", "")
    UPSTASH_REDIS_REST_TOKEN: str = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
    CACHE_ENABLED: bool = os.getenv("CACHE_ENABLED", "true").lower() == "true"
    CACHE_TTL_DASHBOARD: int = 300  # 5 minutes
    CACHE_TTL_STATS: int = 300  # 5 minutes
    CACHE_TTL_ANALYTICS: int = 300  # 5 minutes
    CACHE_TTL_QUIZ: int = 3600  # 1 hour
    CACHE_TTL_CHAT: int = 1800  # 30 minutes

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Create global settings instance
settings = Settings()