from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class LeaderboardEntry(BaseModel):
    """Single leaderboard entry"""
    rank: int
    user_id: str
    name: str
    xp: int
    level: int
    streak: int
    badges_count: int = 0
    average_quiz_score: Optional[float] = None
    is_current_user: bool = False


class LeaderboardResponse(BaseModel):
    """Global leaderboard response"""
    entries: List[LeaderboardEntry]
    total_users: int
    current_user_rank: Optional[int] = None
    period: str  # "all_time", "monthly", "weekly"
    last_updated: datetime


class UserRankResponse(BaseModel):
    """User's rank info with nearby users"""
    your_rank: int
    your_xp: int
    your_level: int
    percentile: float  # Top X%
    nearby_users: List[LeaderboardEntry]  # Users ranked nearby (±5)
    total_users: int
