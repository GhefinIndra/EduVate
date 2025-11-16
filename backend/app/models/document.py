from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentUploadResponse(BaseModel):
    """
    Response setelah upload PDF
    """
    doc_id: str
    title: str
    pages: int
    status: str  # processing, ready, failed
    message: str
    subject_id: str

class DocumentInfo(BaseModel):
    """
    Info dokumen
    """
    id: str
    owner_id: str
    subject_id: Optional[str]  # NULL untuk dokumen lama (backward compatibility)
    title: str
    filename: str
    pages: int
    status: str
    created_at: datetime

class DocumentListResponse(BaseModel):
    """
    List dokumen user
    """
    documents: list[DocumentInfo]
    total: int