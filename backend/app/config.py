from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # MySQL Database Configuration
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    
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
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Create global settings instance
settings = Settings()