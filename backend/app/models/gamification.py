from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

# ===================================
# Badge Info
# ===================================
class BadgeInfo(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    unlocked_at: Optional[datetime] = None  # None = belum unlock

# ===================================
# GET /me/progress Response
# ===================================
class ProgressResponse(BaseModel):
    user_id: str
    xp: int
    level: int
    xp_for_current_level: int      # Total XP dibutuhkan untuk level sekarang
    xp_for_next_level: int          # Total XP dibutuhkan untuk level berikutnya
    xp_progress_in_current_level: int  # XP yang sudah dikumpulkan di level ini
    xp_needed_for_next_level: int   # XP yang masih dibutuhkan untuk naik level
    xp_progress_percentage: float   # Percentage progress (0-100)
    streak: int
    last_activity: Optional[date]
    badges: List[BadgeInfo]

# ===================================
# GET /me/stats Response
# ===================================
class StatsResponse(BaseModel):
    user_id: str
    total_documents: int
    total_chat_sessions: int
    total_messages_sent: int
    total_quizzes_taken: int
    total_quiz_submissions: int
    average_quiz_score: float      # Rata-rata percentage (0-100)
    perfect_scores: int             # Berapa kali dapat 100%
    total_questions_answered: int   # Total soal dijawab
    member_since: datetime

# ===================================
# Document Understanding
# ===================================
class DocumentUnderstanding(BaseModel):
    doc_id: str
    title: str
    understanding_percentage: float     # Sama dengan average_quiz_score
    total_quizzes: int
    latest_quiz_score: float
    average_quiz_score: float

class DocumentUnderstandingResponse(BaseModel):
    documents: List[DocumentUnderstanding]

# ===================================
# Topic Understanding (replaces Document Understanding)
# ===================================
class TopicUnderstanding(BaseModel):
    topic_id: str
    topic_name: str
    understanding_percentage: float     # Average quiz score for all quizzes in this topic
    total_quizzes: int
    total_attempts: int                 # Total submissions across all quizzes
    latest_quiz_score: float
    average_quiz_score: float
    insight: Optional[str] = None       # AI-generated insight about user's understanding

class TopicUnderstandingResponse(BaseModel):
    topics: List[TopicUnderstanding]