from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Request models
class CreateTopicRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Nama topik (e.g., 'Materi Python')")
    description: Optional[str] = Field(None, description="Deskripsi topik (opsional)")

class UpdateTopicRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None

# Response models
class TopicResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Stats (optional - untuk tampilan UI)
    document_count: Optional[int] = 0
    chat_count: Optional[int] = 0
    quiz_count: Optional[int] = 0

class TopicListResponse(BaseModel):
    topics: list[TopicResponse]
    total: int

class TopicDetailResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    document_count: int
    chat_count: int
    quiz_count: int
