from fastapi import APIRouter, Depends, HTTPException, Query
from app.database import get_db, get_dict_cursor
from app.auth import get_current_user
from app.models.leaderboard import (
    LeaderboardResponse, LeaderboardEntry, UserRankResponse
)
from app.utils.cache import cache_get, cache_set
from datetime import datetime
import logging

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])
logger = logging.getLogger(__name__)


@router.get("/global", response_model=LeaderboardResponse)
def get_global_leaderboard(
    limit: int = Query(100, ge=10, le=100),
    period: str = Query("all_time", pattern="^(all_time|monthly|weekly)$"),
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get global leaderboard

    Params:
        - limit: Number of top users to return (10-100)
        - period: "all_time", "monthly", "weekly"

    Returns:
        - Top N users ranked by XP
        - Current user's rank
        - Real-time (cached 1 minute)
    """
    # Cache key
    cache_key = f"leaderboard:global:{period}:{limit}"
    cached = cache_get(cache_key)

    if cached:
        # Add current user highlight to cached data
        for entry in cached['entries']:
            entry['is_current_user'] = (entry['user_id'] == user_id)
        cached['current_user_rank'] = get_user_rank(user_id, db)
        return LeaderboardResponse(**cached)

    cursor = get_dict_cursor(db)

    try:
        # Query leaderboard with ranks
        query = """
            WITH ranked_users AS (
                SELECT
                    u.id as user_id,
                    u.name,
                    g.xp,
                    g.level,
                    g.streak,
                    ROW_NUMBER() OVER (ORDER BY g.xp DESC, g.level DESC, u.name ASC) as rank
                FROM users u
                JOIN gamification g ON u.id = g.user_id
                ORDER BY g.xp DESC, g.level DESC, u.name ASC
            )
            SELECT * FROM ranked_users
            LIMIT %s
        """

        cursor.execute(query, (limit,))
        rows = cursor.fetchall()

        # Get total users count
        cursor.execute("SELECT COUNT(*) as total FROM users")
        total_users = cursor.fetchone()['total']

        # Get current user's rank
        current_user_rank = get_user_rank(user_id, db)

        # Build entries
        entries = []
        for row in rows:
            # Count badges for this user
            cursor.execute("""
                SELECT badges
                FROM gamification
                WHERE user_id = %s
            """, (row['user_id'],))
            badge_data = cursor.fetchone()
            badges_count = len(badge_data['badges']) if badge_data and badge_data['badges'] else 0

            entries.append(LeaderboardEntry(
                rank=row['rank'],
                user_id=row['user_id'],
                name=row['name'],
                xp=row['xp'],
                level=row['level'],
                streak=row['streak'] or 0,
                badges_count=badges_count,
                is_current_user=(row['user_id'] == user_id)
            ))

        response_data = {
            'entries': [e.model_dump() for e in entries],
            'total_users': total_users,
            'current_user_rank': current_user_rank,
            'period': period,
            'last_updated': datetime.now().isoformat()
        }

        # Cache for 1 minute
        cache_set(cache_key, response_data, ttl=60)

        return LeaderboardResponse(**response_data)

    finally:
        cursor.close()


@router.get("/me", response_model=UserRankResponse)
def get_my_rank(
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get current user's rank + nearby users

    Returns:
        - Your rank
        - Your stats
        - Users ranked ±5 positions around you
    """
    cursor = get_dict_cursor(db)

    try:
        # Get user's stats
        cursor.execute("""
            SELECT xp, level
            FROM gamification
            WHERE user_id = %s
        """, (user_id,))
        user_data = cursor.fetchone()

        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")

        user_xp = user_data['xp']
        user_level = user_data['level']

        # Get user's rank
        user_rank = get_user_rank(user_id, db)

        # Get total users
        cursor.execute("SELECT COUNT(*) as total FROM users")
        total_users = cursor.fetchone()['total']

        # Calculate percentile
        percentile = ((total_users - user_rank) / total_users) * 100 if total_users > 0 else 0

        # Get nearby users (rank ±5)
        cursor.execute("""
            WITH ranked_users AS (
                SELECT
                    u.id,
                    u.name,
                    g.xp,
                    g.level,
                    g.streak,
                    ROW_NUMBER() OVER (ORDER BY g.xp DESC, g.level DESC, u.name ASC) as rank
                FROM users u
                JOIN gamification g ON u.id = g.user_id
            )
            SELECT * FROM ranked_users
            WHERE rank BETWEEN %s AND %s
            ORDER BY rank ASC
        """, (max(1, user_rank - 5), user_rank + 5))

        nearby_rows = cursor.fetchall()

        nearby_users = []
        for row in nearby_rows:
            nearby_users.append(LeaderboardEntry(
                rank=row['rank'],
                user_id=row['id'],
                name=row['name'],
                xp=row['xp'],
                level=row['level'],
                streak=row['streak'] or 0,
                badges_count=0,  # Skip for performance
                is_current_user=(row['id'] == user_id)
            ))

        return UserRankResponse(
            your_rank=user_rank,
            your_xp=user_xp,
            your_level=user_level,
            percentile=round(percentile, 2),
            nearby_users=nearby_users,
            total_users=total_users
        )

    finally:
        cursor.close()


def get_user_rank(user_id: str, db) -> int:
    """Helper function to get user's rank"""
    cursor = get_dict_cursor(db)
    try:
        cursor.execute("""
            SELECT COUNT(*) + 1 as rank
            FROM gamification g1
            JOIN users u1 ON g1.user_id = u1.id
            WHERE g1.xp > (
                SELECT xp FROM gamification WHERE user_id = %s
            )
        """, (user_id,))
        result = cursor.fetchone()
        return result['rank'] if result else 1
    finally:
        cursor.close()
