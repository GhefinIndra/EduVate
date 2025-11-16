from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class RegisterRequest(BaseModel):
    """
    Request body untuk register user baru
    """
    email: EmailStr  # Auto-validate email format
    name: str
    password: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "student@example.com",
                "name": "John Doe",
                "password": "password123"
            }
        }

class LoginRequest(BaseModel):
    """
    Request body untuk login
    """
    email: EmailStr
    password: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "student@example.com",
                "password": "password123"
            }
        }

class TokenResponse(BaseModel):
    """
    Response setelah login berhasil
    """
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str
    email: str

class UserResponse(BaseModel):
    """
    Response data user (tanpa password)
    """
    id: str
    email: str
    name: str
    created_at: datetime
