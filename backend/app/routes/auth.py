from fastapi import APIRouter, HTTPException, Depends, status
from mysql.connector import Error as MySQLError
from datetime import timedelta
import uuid
import json

from app.models.user import RegisterRequest, LoginRequest, TokenResponse
from app.database import get_db
from app.auth import get_password_hash, verify_password, create_access_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db=Depends(get_db)):
    """
    Register user baru
    
    - Validasi email belum terdaftar
    - Hash password
    - Insert ke database (users + gamification)
    - Return success message
    """
    cursor = db.cursor(dictionary=True)
    
    try:
        # 1. Check apakah email sudah ada
        cursor.execute("SELECT id FROM users WHERE email = %s", (request.email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # 2. Generate user_id & hash password
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(request.password)
        
        # 3. Insert ke tabel users
        insert_user_query = """
            INSERT INTO users (id, email, name, hashed_password)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_user_query, (user_id, request.email, request.name, hashed_password))
        
        # 4. Insert ke tabel gamification (init XP, level, badges)
        insert_gamification_query = """
            INSERT INTO gamification (user_id, xp, level, badges, streak, last_activity)
            VALUES (%s, 0, 1, %s, 0, NULL)
        """
        cursor.execute(insert_gamification_query, (user_id, json.dumps([])))
        
        # 5. Commit transaction
        db.commit()
        
        return {
            "message": "User registered successfully",
            "user_id": user_id,
            "email": request.email,
            "name": request.name
        }
        
    except MySQLError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db=Depends(get_db)):
    """
    Login user
    
    - Validasi email & password
    - Generate JWT token
    - Return token + user info
    """
    cursor = db.cursor(dictionary=True)
    
    try:
        # 1. Get user dari database
        cursor.execute(
            "SELECT id, email, name, hashed_password FROM users WHERE email = %s",
            (request.email,)
        )
        user = cursor.fetchone()
        
        # 2. Validasi user exists & password correct
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        if not verify_password(request.password, user['hashed_password']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # 3. Generate JWT token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user['id']},
            expires_delta=access_token_expires
        )
        
        # 4. Return token + user info
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user['id'],
            name=user['name'],
            email=user['email']
        )
        
    except MySQLError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()
