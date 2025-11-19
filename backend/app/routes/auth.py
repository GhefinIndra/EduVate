from fastapi import APIRouter, HTTPException, Depends, status
from psycopg2 import Error as PostgreSQLError
from datetime import timedelta
import uuid
import json
import logging

from app.models.user import RegisterRequest, LoginRequest, TokenResponse
from app.database import get_db, get_dict_cursor
from app.auth import get_password_hash, verify_password, create_access_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db=Depends(get_db)):
    """
    Register user baru
    
    - Validasi email belum terdaftar
    - Hash password
    - Insert ke database (users + gamification)
    - Return success message
    """
    cursor = get_dict_cursor(db)
    
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
        logger.info(f"Hashing password for new user {user_id}")
        hashed_password = get_password_hash(request.password)
        logger.debug(f"Generated hash: {hashed_password[:20]}...")
        
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
        
    except PostgreSQLError as e:
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
    cursor = get_dict_cursor(db)
    
    try:
        # 1. Get user dari database
        cursor.execute(
            "SELECT id, email, name, hashed_password FROM users WHERE email = %s",
            (request.email,)
        )
        user = cursor.fetchone()
        
        # 2. Validasi user exists & password correct
        if not user:
            logger.warning(f"Login failed: User not found for email {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        logger.info(f"Attempting password verification for user {user['id']}")
        logger.debug(f"Stored hash: {user['hashed_password'][:20]}...")
        
        password_valid = verify_password(request.password, user['hashed_password'])
        logger.info(f"Password verification result: {password_valid}")
        
        if not password_valid:
            logger.warning(f"Login failed: Invalid password for user {user['id']}")
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
        
    except PostgreSQLError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()
