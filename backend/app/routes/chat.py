from fastapi import APIRouter, Depends, HTTPException, status
from mysql.connector import Error as MySQLError
import uuid
import json
from typing import List, Tuple

from app.models.chat import (
    CreateSessionRequest, SessionResponse, SendMessageRequest,
    MessageResponse, ChatHistoryResponse, Citation
)
from app.database import get_db
from app.auth import get_current_user
from app.utils.gemini_client import generate_answer_from_context, generate_session_title
from app.utils.badge_checker import update_streak, check_and_unlock_badges

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/sessions", response_model=SessionResponse)
def create_session(
    request: CreateSessionRequest,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Buat chat session baru untuk topik (multi-doc chat)
    """
    cursor = db.cursor(dictionary=True)

    try:
        # Verify topic exists & owned by user
        cursor.execute(
            "SELECT id FROM topics WHERE id = %s AND user_id = %s",
            (request.subject_id, user_id)
        )
        topic = cursor.fetchone()

        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not found"
            )

        # Create session
        session_id = str(uuid.uuid4())
        insert_query = """
            INSERT INTO chat_sessions (id, user_id, subject_id, title)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_query, (session_id, user_id, request.subject_id, "New Chat"))
        db.commit()

        # Get created session
        cursor.execute(
            "SELECT id as session_id, subject_id, title, created_at, updated_at FROM chat_sessions WHERE id = %s",
            (session_id,)
        )
        session = cursor.fetchone()

        return SessionResponse(**session)
        
    except MySQLError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()

@router.get("/sessions", response_model=List[SessionResponse])
def list_sessions(
    subject_id: str = None,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    List semua chat sessions
    Optional: filter by subject_id
    """
    cursor = db.cursor(dictionary=True)

    try:
        if subject_id:
            cursor.execute(
                """
                SELECT id as session_id, subject_id, title, created_at, updated_at
                FROM chat_sessions
                WHERE user_id = %s AND subject_id = %s
                ORDER BY updated_at DESC
                """,
                (user_id, subject_id)
            )
        else:
            cursor.execute(
                """
                SELECT id as session_id, subject_id, title, created_at, updated_at
                FROM chat_sessions
                WHERE user_id = %s
                ORDER BY updated_at DESC
                """,
                (user_id,)
            )

        sessions = cursor.fetchall()
        return [SessionResponse(**s) for s in sessions]

    finally:
        cursor.close()

@router.get("/sessions/{session_id}/messages", response_model=ChatHistoryResponse)
def get_chat_history(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get chat history dari session
    """
    cursor = db.cursor(dictionary=True)
    
    try:
        # Verify session ownership
        cursor.execute(
            "SELECT id FROM chat_sessions WHERE id = %s AND user_id = %s",
            (session_id, user_id)
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Get messages
        cursor.execute(
            """
            SELECT id, session_id, role, content, citations, created_at
            FROM chat_messages
            WHERE session_id = %s
            ORDER BY created_at ASC
            """,
            (session_id,)
        )
        messages = cursor.fetchall()
        
        # Parse citations JSON
        for msg in messages:
            if msg['citations']:
                msg['citations'] = json.loads(msg['citations'])
        
        return ChatHistoryResponse(
            session_id=session_id,
            messages=[MessageResponse(**m) for m in messages],
            total=len(messages)
        )
        
    finally:
        cursor.close()

@router.post("/sessions/{session_id}/messages", response_model=MessageResponse)
def send_message(
    session_id: str,
    request: SendMessageRequest,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Send message ke session (RAG MAGIC!)
    
    Flow:
    1. Save user message
    2. Get doc_id dari session
    3. Search similar chunks dari ChromaDB
    4. Get chat history (last 5 messages)
    5. Generate answer pakai Gemini
    6. Save assistant message
    7. Update session title (jika chat pertama)
    """
    cursor = db.cursor(dictionary=True)
    
    try:
        # 1. Verify session & get subject_id
        cursor.execute(
            "SELECT subject_id FROM chat_sessions WHERE id = %s AND user_id = %s",
            (session_id, user_id)
        )
        session = cursor.fetchone()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        subject_id = session['subject_id']
        
        # 2. Save user message
        user_msg_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO chat_messages (id, session_id, role, content, citations)
            VALUES (%s, %s, 'user', %s, NULL)
            """,
            (user_msg_id, session_id, request.content)
        )
        db.commit()
        
        # 3a. Ambil riwayat percakapan sebelumnya untuk konteks AI
        cursor.execute(
            """
            SELECT role, content
            FROM chat_messages
            WHERE session_id = %s AND id != %s
            ORDER BY created_at ASC
            """,
            (session_id, user_msg_id)
        )
        raw_history = cursor.fetchall()
        chat_history_pairs: List[Tuple[str, str]] = []
        pending_user_msg = None
        for msg in raw_history:
            if msg['role'] == 'user':
                pending_user_msg = msg['content']
            elif msg['role'] == 'assistant' and pending_user_msg:
                chat_history_pairs.append((pending_user_msg, msg['content']))
                pending_user_msg = None
        # batasi supaya tidak terlalu panjang
        if len(chat_history_pairs) > 5:
            chat_history_pairs = chat_history_pairs[-5:]

        # 3. Generate answer dengan LangChain (MULTI-DOC retrieval + generation)
        try:
            print(f"[DEBUG] Calling LangChain with subject_id: {subject_id}, query: {request.content[:50]}...")
            result = generate_answer_from_context(
                query=request.content,
                subject_id=subject_id,  # Multi-doc retrieval dari semua docs dalam topic
                chat_history=chat_history_pairs if chat_history_pairs else None
            )
            print(f"[DEBUG] LangChain result: {result.keys()}")
        except Exception as lang_err:
            print(f"[ERROR] LangChain error: {str(lang_err)}")
            print(f"[ERROR] Full traceback:")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LangChain error: {str(lang_err)}"
            )
        
        # 6. Save assistant message
        assistant_msg_id = str(uuid.uuid4())
        citations_json = json.dumps(result['citations'])
        
        cursor.execute(
            """
            INSERT INTO chat_messages (id, session_id, role, content, citations)
            VALUES (%s, %s, 'assistant', %s, %s)
            """,
            (assistant_msg_id, session_id, result['answer'], citations_json)
        )
        
        # 7. Update session (updated_at & title if first message)
        cursor.execute(
            "SELECT COUNT(*) as count FROM chat_messages WHERE session_id = %s",
            (session_id,)
        )
        msg_count = cursor.fetchone()['count']
        
        if msg_count == 2:  # First Q&A (user + assistant)
            title = generate_session_title(request.content)
            cursor.execute(
                "UPDATE chat_sessions SET title = %s, updated_at = NOW() WHERE id = %s",
                (title, session_id)
            )
        else:
            cursor.execute(
                "UPDATE chat_sessions SET updated_at = NOW() WHERE id = %s",
                (session_id,)
            )
        
        db.commit()

        # Update streak & check badges
        update_streak(user_id, db)
        check_and_unlock_badges(user_id, db)
        
        # Get created message
        cursor.execute(
            """
            SELECT id, session_id, role, content, citations, created_at
            FROM chat_messages
            WHERE id = %s
            """,
            (assistant_msg_id,)
        )
        message = cursor.fetchone()
        message['citations'] = json.loads(message['citations'])
        
        return MessageResponse(**message)
        
    except MySQLError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )
    finally:
        cursor.close()

@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Delete chat session (CASCADE delete messages)
    """
    cursor = db.cursor(dictionary=True)
    
    try:
        # Verify ownership
        cursor.execute(
            "SELECT id FROM chat_sessions WHERE id = %s AND user_id = %s",
            (session_id, user_id)
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Delete (CASCADE akan hapus messages)
        cursor.execute("DELETE FROM chat_sessions WHERE id = %s", (session_id,))
        db.commit()
        
        return {"message": "Session deleted successfully"}
        
    except MySQLError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()
