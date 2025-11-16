from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CreateSessionRequest(BaseModel):
    """
    Request untuk create chat session baru (untuk topik/subject)
    """
    subject_id: str

class SessionResponse(BaseModel):
    """
    Response session info
    """
    session_id: str
    subject_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    
class SendMessageRequest(BaseModel):
    """
    Request untuk send message ke session
    """
    content: str
    
class Citation(BaseModel):
    """
    Citation/sitasi dari dokumen (multi-doc support)
    """
    page: int
    snippet: str
    doc_id: Optional[str] = None  # Document ID (untuk multi-doc, tunjukkan dari file mana)
    
class MessageResponse(BaseModel):
    """
    Response message (user atau assistant)
    """
    id: str
    session_id: str
    role: str  # user atau assistant
    content: str
    citations: Optional[List[Citation]] = None
    created_at: datetime
    
class ChatHistoryResponse(BaseModel):
    """
    Response chat history
    """
    session_id: str
    messages: List[MessageResponse]
    total: int