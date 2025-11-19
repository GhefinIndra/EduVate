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

# ===================================
# Analytics - XP History
# ===================================
class XPDataPoint(BaseModel):
    date: str  # Format: YYYY-MM-DD
    xp: int
    cumulative_xp: int

class XPHistoryResponse(BaseModel):
    data_points: List[XPDataPoint]
    total_xp_gained: int
    days_tracked: int

# ===================================
# Analytics - Quiz Performance Trend
# ===================================
class QuizPerformanceDataPoint(BaseModel):
    quiz_id: str
    quiz_title: str
    topic_name: str
    score_percentage: float
    submitted_at: datetime

class QuizPerformanceTrendResponse(BaseModel):
    performances: List[QuizPerformanceDataPoint]
    average_score: float
    total_quizzes: int
    trend: str  # "improving", "stable", "declining"

# ===================================
# Analytics - Activity Summary
# ===================================
class ActivitySummary(BaseModel):
    total_chat_messages: int
    total_documents_uploaded: int
    total_quizzes_taken: int
    total_study_days: int  # Days with any activity
    most_active_topic: Optional[str] = None
    study_streak_record: int

class ActivitySummaryResponse(BaseModel):
    summary: ActivitySummary
    recent_activities: List[dict]  # Last 10 activities

# ===================================
# Analytics - Daily Activity for Heatmap
# ===================================
class DailyActivity(BaseModel):
    date: str  # Format: YYYY-MM-DD
    activity_count: int  # Total activities (quiz submissions + messages + uploads)
    quizzes: int
    messages: int
    uploads: int

class DailyActivityResponse(BaseModel):
    activities: List[DailyActivity]
    days_tracked: int
    total_activity_count: int

# ===================================
# Dashboard Combined Response
# ===================================
class DashboardResponse(BaseModel):
    stats: StatsResponse
    progress: ProgressResponse
    topic_understanding: TopicUnderstandingResponse
    topics: List[dict]  # Same structure as /topics endpoint