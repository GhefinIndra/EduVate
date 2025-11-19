from fastapi import APIRouter, Depends, HTTPException, status
from psycopg2 import Error as PostgreSQLError
import json
import logging
from datetime import datetime, timedelta
from collections import defaultdict

from app.utils.cache import cache_get, cache_set, invalidate_user_cache
from app.config import settings

from app.models.gamification import (
    ProgressResponse, StatsResponse, BadgeInfo,
    DocumentUnderstandingResponse, DocumentUnderstanding,
    TopicUnderstandingResponse, TopicUnderstanding,
    XPHistoryResponse, XPDataPoint,
    QuizPerformanceTrendResponse, QuizPerformanceDataPoint,
    ActivitySummaryResponse, ActivitySummary,
    DailyActivityResponse, DailyActivity,
    DashboardResponse
)
from app.database import get_db, get_dict_cursor
from app.auth import get_current_user
from app.utils.badge_checker import get_all_badges, check_and_unlock_badges, update_streak
from app.utils.insight_generator import generate_topic_insight

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me", tags=["Gamification"])

# Helper: Convert datetime objects to ISO strings for JSON serialization
def convert_datetime_for_cache(obj):
    """Recursively convert datetime objects to ISO strings"""
    if isinstance(obj, dict):
        return {k: convert_datetime_for_cache(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetime_for_cache(item) for item in obj]
    elif hasattr(obj, 'isoformat'):  # datetime object
        return obj.isoformat()
    return obj

# ===================================
# Helper: Calculate Level Thresholds (Exponential)
# ===================================
def calculate_level_thresholds(level: int):
    """
    Calculate XP thresholds untuk level tertentu (Opsi B: Exponential)
    
    Level 1: 0-99 XP (butuh 100)
    Level 2: 100-299 XP (butuh 200)
    Level 3: 300-599 XP (butuh 300)
    Level 4: 600-999 XP (butuh 400)
    
    Returns: (xp_for_current_level, xp_for_next_level)
    """
    xp_for_current = 0
    for i in range(1, level):
        xp_for_current += i * 100
    
    xp_for_next = xp_for_current + (level * 100)
    
    return xp_for_current, xp_for_next

def calculate_level_from_xp(xp: int):
    """
    Calculate level dari total XP (Opsi B: Exponential)
    
    Level 1: 0-99 XP
    Level 2: 100-299 XP (butuh 200 XP cumulative)
    Level 3: 300-599 XP (butuh 300 XP cumulative)
    """
    if xp < 100:
        return 1
    
    level = 1
    threshold = 100
    consumed_xp = 0
    
    while consumed_xp + threshold <= xp:
        consumed_xp += threshold
        level += 1
        threshold = level * 100
    
    return level

# ===================================
# GET /me/progress
# ===================================
@router.get("/progress", response_model=ProgressResponse)
def get_my_progress(user_id: str = Depends(get_current_user), db = Depends(get_db)):
    """
    Get user gamification progress

    - XP, Level, Streak
    - XP progress untuk next level
    - All badges (unlocked + locked)
    """
    cursor = get_dict_cursor(db)

    try:
        logger.info(f"Fetching progress for user {user_id}")
        # 1. Update streak (jika user baru aktif hari ini)
        update_streak(user_id, db)
        
        # 2. Check & unlock badges (passive check untuk week_warrior & scholar)
        check_and_unlock_badges(user_id, db)
        
        # 3. Get gamification data
        cursor.execute(
            "SELECT xp, level, streak, last_activity FROM gamification WHERE user_id = %s",
            (user_id,)
        )
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gamification data not found"
            )
        
        xp = row['xp']
        level = row['level']
        streak = row['streak'] or 0
        last_activity = row['last_activity']
        
        # 4. Calculate level progress
        xp_for_current_level, xp_for_next_level = calculate_level_thresholds(level)
        xp_progress_in_current = xp - xp_for_current_level
        xp_needed_for_next = xp_for_next_level - xp
        
        # Calculate percentage (handle division by zero)
        level_xp_range = xp_for_next_level - xp_for_current_level
        if level_xp_range > 0:
            xp_progress_percentage = (xp_progress_in_current / level_xp_range) * 100
        else:
            xp_progress_percentage = 0.0
        
        # 5. Get all badges (unlocked + locked)
        badges = get_all_badges(user_id, db)
        
        # Convert to BadgeInfo objects
        badge_objects = [
            BadgeInfo(
                id=b['id'],
                name=b['name'],
                description=b['description'],
                icon=b['icon'],
                unlocked_at=datetime.fromisoformat(b['unlocked_at']) if b['unlocked_at'] else None
            )
            for b in badges
        ]
        
        return ProgressResponse(
            user_id=user_id,
            xp=xp,
            level=level,
            xp_for_current_level=xp_for_current_level,
            xp_for_next_level=xp_for_next_level,
            xp_progress_in_current_level=xp_progress_in_current,
            xp_needed_for_next_level=xp_needed_for_next,
            xp_progress_percentage=round(xp_progress_percentage, 2),
            streak=streak,
            last_activity=last_activity,
            badges=badge_objects
        )
        
    except PostgreSQLError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()

# ===================================
# GET /me/stats
# ===================================
@router.get("/stats", response_model=StatsResponse)
def get_my_stats(user_id: str = Depends(get_current_user), db = Depends(get_db)):
    """
    Get user overview statistics
    
    - Total documents, chats, quizzes
    - Average quiz score
    - Perfect scores count
    """
    # Check cache first
    cache_key = f"stats:{user_id}"
    cached = cache_get(cache_key)
    if cached:
        return StatsResponse(**cached)
    
    cursor = get_dict_cursor(db)
    
    try:
        # 1. Get user created_at
        cursor.execute("SELECT created_at FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        member_since = user['created_at']
        
        # 2. Count total documents
        cursor.execute(
            "SELECT COUNT(*) as total FROM documents WHERE owner_id = %s",
            (user_id,)
        )
        total_documents = cursor.fetchone()['total']
        
        # 3. Count total chat sessions
        cursor.execute(
            "SELECT COUNT(*) as total FROM chat_sessions WHERE user_id = %s",
            (user_id,)
        )
        total_chat_sessions = cursor.fetchone()['total']
        
        # 4. Count total messages sent (user only)
        cursor.execute(
            "SELECT COUNT(*) as total FROM chat_messages cm "
            "JOIN chat_sessions cs ON cm.session_id = cs.id "
            "WHERE cs.user_id = %s AND cm.role = 'user'",
            (user_id,)
        )
        total_messages_sent = cursor.fetchone()['total']
        
        # 5. Count total quiz submissions
        cursor.execute(
            "SELECT COUNT(*) as total FROM submissions WHERE user_id = %s",
            (user_id,)
        )
        total_quiz_submissions = cursor.fetchone()['total']
        
        # 6. Count unique quizzes taken
        cursor.execute(
            "SELECT COUNT(DISTINCT quiz_id) as total FROM submissions WHERE user_id = %s",
            (user_id,)
        )
        total_quizzes_taken = cursor.fetchone()['total']
        
        # 7. Calculate average quiz score (percentage)
        cursor.execute(
            "SELECT AVG((total_score / max_score) * 100) as avg_score "
            "FROM submissions WHERE user_id = %s AND max_score > 0",
            (user_id,)
        )
        avg_result = cursor.fetchone()['avg_score']
        average_quiz_score = round(float(avg_result), 2) if avg_result else 0.0
        
        # 8. Count perfect scores (100%)
        cursor.execute(
            "SELECT COUNT(*) as total FROM submissions "
            "WHERE user_id = %s AND total_score = max_score AND max_score > 0",
            (user_id,)
        )
        perfect_scores = cursor.fetchone()['total']
        
        # 9. Count total questions answered
        cursor.execute(
            "SELECT COUNT(*) as total FROM submission_answers sa "
            "JOIN submissions s ON sa.submission_id = s.id "
            "WHERE s.user_id = %s",
            (user_id,)
        )
        total_questions_answered = cursor.fetchone()['total']
        
        response = StatsResponse(
            user_id=user_id,
            total_documents=total_documents,
            total_chat_sessions=total_chat_sessions,
            total_messages_sent=total_messages_sent,
            total_quizzes_taken=total_quizzes_taken,
            total_quiz_submissions=total_quiz_submissions,
            average_quiz_score=average_quiz_score,
            perfect_scores=perfect_scores,
            total_questions_answered=total_questions_answered,
            member_since=member_since
        )
        
        # Cache the response (convert to dict with JSON-safe datetime)
        cache_data = response.model_dump()
        cache_data['member_since'] = member_since.isoformat() if member_since else None
        cache_set(cache_key, cache_data, ttl=settings.CACHE_TTL_STATS)
        
        return response
        
    except PostgreSQLError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()

# ===================================
# GET /me/document-understanding
# ===================================
@router.get("/document-understanding", response_model=DocumentUnderstandingResponse)
def get_document_understanding(user_id: str = Depends(get_current_user), db = Depends(get_db)):
    """
    Get understanding percentage per document
    
    - Based on average quiz score per document
    - Only show documents that have quizzes
    - Ordered by latest submission
    """
    cursor = get_dict_cursor(db)
    
    try:
        # Query to get document understanding stats
        query = """
            SELECT 
                d.id as doc_id,
                d.title,
                COUNT(DISTINCT s.id) as total_quizzes,
                AVG((s.total_score / s.max_score) * 100) as avg_score
            FROM documents d
            JOIN quizzes q ON d.id = q.doc_id
            JOIN submissions s ON q.id = s.quiz_id
            WHERE d.owner_id = %s AND s.user_id = %s AND s.max_score > 0
            GROUP BY d.id, d.title
            HAVING total_quizzes > 0
            ORDER BY MAX(s.submitted_at) DESC
        """
        
        cursor.execute(query, (user_id, user_id))
        rows = cursor.fetchall()
        
        documents = []
        for row in rows:
            doc_id = row['doc_id']
            
            # Get latest quiz score for this document
            cursor.execute("""
                SELECT (s.total_score / s.max_score) * 100 as score
                FROM submissions s
                JOIN quizzes q ON s.quiz_id = q.id
                WHERE q.doc_id = %s AND s.user_id = %s AND s.max_score > 0
                ORDER BY s.submitted_at DESC
                LIMIT 1
            """, (doc_id, user_id))
            
            latest = cursor.fetchone()
            latest_score = round(float(latest['score']), 2) if latest else 0.0
            
            avg_score = round(float(row['avg_score']), 2)
            
            documents.append(DocumentUnderstanding(
                doc_id=doc_id,
                title=row['title'],
                understanding_percentage=avg_score,
                total_quizzes=row['total_quizzes'],
                latest_quiz_score=latest_score,
                average_quiz_score=avg_score
            ))
        
        return DocumentUnderstandingResponse(documents=documents)

    except PostgreSQLError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()

# ===================================
# GET /me/topic-understanding
# ===================================
@router.get("/topic-understanding", response_model=TopicUnderstandingResponse)
def get_topic_understanding(user_id: str = Depends(get_current_user), db = Depends(get_db)):
    """
    Get understanding percentage per topic with AI-generated insights

    - Based on average quiz score per topic
    - Only show topics that have quizzes
    - Ordered by latest submission
    - Includes AI-generated insight for each topic
    """
    # Check cache first
    cache_key = f"analytics:topic_understanding:{user_id}"
    cached = cache_get(cache_key)
    if cached:
        logger.info(f"🎯 Cache HIT for topic understanding: {user_id}")
        return TopicUnderstandingResponse(**cached)
    
    logger.info(f"💾 Cache MISS for topic understanding: {user_id}")
    cursor = get_dict_cursor(db)

    try:
        # Query to get topic understanding stats
        query = """
            SELECT
                t.id as topic_id,
                t.name as topic_name,
                COUNT(DISTINCT q.id) as total_quizzes,
                COUNT(DISTINCT s.id) as total_attempts,
                AVG((s.total_score / s.max_score) * 100) as avg_score,
                MAX(s.submitted_at) as latest_submission
            FROM topics t
            JOIN quizzes q ON t.id = q.subject_id
            JOIN submissions s ON q.id = s.quiz_id
            WHERE t.user_id = %s AND s.user_id = %s AND s.max_score > 0
            GROUP BY t.id, t.name
            HAVING COUNT(DISTINCT q.id) > 0
            ORDER BY latest_submission DESC
        """

        cursor.execute(query, (user_id, user_id))
        rows = cursor.fetchall()

        topics = []
        for row in rows:
            topic_id = row['topic_id']
            topic_name = row['topic_name']

            # Get latest quiz score for this topic
            cursor.execute("""
                SELECT (s.total_score / s.max_score) * 100 as score
                FROM submissions s
                JOIN quizzes q ON s.quiz_id = q.id
                WHERE q.subject_id = %s AND s.user_id = %s AND s.max_score > 0
                ORDER BY s.submitted_at DESC
                LIMIT 1
            """, (topic_id, user_id))

            latest = cursor.fetchone()
            latest_score = round(float(latest['score']), 2) if latest else 0.0

            avg_score = round(float(row['avg_score']), 2)
            total_quizzes = row['total_quizzes']
            total_attempts = row['total_attempts']

            # Generate AI insight
            try:
                insight = generate_topic_insight(
                    topic_name=topic_name,
                    understanding_percentage=avg_score,
                    total_quizzes=total_quizzes,
                    total_attempts=total_attempts,
                    latest_score=latest_score
                )
            except Exception as e:
                # Fallback if insight generation fails
                print(f"Failed to generate insight for {topic_name}: {str(e)}")
                insight = None

            topics.append(TopicUnderstanding(
                topic_id=topic_id,
                topic_name=topic_name,
                understanding_percentage=avg_score,
                total_quizzes=total_quizzes,
                total_attempts=total_attempts,
                latest_quiz_score=latest_score,
                average_quiz_score=avg_score,
                insight=insight
            ))

        response = TopicUnderstandingResponse(topics=topics)
        
        # Cache the response
        cache_data = convert_datetime_for_cache(response.model_dump())
        cache_set(cache_key, cache_data, ttl=settings.CACHE_TTL_ANALYTICS)
        logger.info(f"✅ Cached topic understanding for user {user_id}")
        
        return response

    except Exception as e:
        logger.error(f"Error in get_topic_understanding: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get topic understanding: {str(e)}"
        )
    finally:
        cursor.close()

# ===================================
# GET /me/analytics/xp-history
# ===================================
@router.get("/analytics/xp-history", response_model=XPHistoryResponse)
def get_xp_history(
    days: int = 30,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get XP gain history over time (default last 30 days)

    Returns daily XP gains and cumulative XP
    """
    # Check cache first
    cache_key = f"xp_history:{user_id}:{days}"
    cached = cache_get(cache_key)
    if cached:
        return XPHistoryResponse(**cached)
    
    cursor = get_dict_cursor(db)

    try:
        logger.info(f"Fetching XP history for user {user_id} (last {days} days)")

        # Get quiz submissions with XP awarded (grouped by date)
        # We'll calculate XP retroactively based on quiz scores
        query = """
            SELECT
                DATE(s.submitted_at) as submission_date,
                COUNT(DISTINCT s.id) as quiz_count,
                SUM(
                    20 +
                    (SELECT COUNT(*) FROM submission_answers sa
                     WHERE sa.submission_id = s.id AND sa.is_correct = true
                     AND (SELECT type FROM questions WHERE id = sa.question_id) = 'mcq') * 5 +
                    (SELECT COUNT(*) FROM submission_answers sa
                     WHERE sa.submission_id = s.id AND sa.score >= sa.score * 0.8
                     AND (SELECT type FROM questions WHERE id = sa.question_id) = 'essay') * 10
                ) as daily_xp
            FROM submissions s
            WHERE s.user_id = %s
                AND s.submitted_at >= CURRENT_DATE - INTERVAL '%s days'
            GROUP BY DATE(s.submitted_at)
            ORDER BY submission_date ASC
        """

        cursor.execute(query, (user_id, days))
        rows = cursor.fetchall()

        # Build data points with cumulative XP
        data_points = []
        cumulative = 0
        total_gained = 0

        # Create a date range for the last N days
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days-1)

        # Map submissions to dates
        submission_map = {row['submission_date']: int(row['daily_xp'] or 0) for row in rows}

        current_date = start_date
        while current_date <= end_date:
            daily_xp = submission_map.get(current_date, 0)
            cumulative += daily_xp
            total_gained += daily_xp

            data_points.append(XPDataPoint(
                date=current_date.isoformat(),
                xp=daily_xp,
                cumulative_xp=cumulative
            ))

            current_date += timedelta(days=1)

        logger.info(f"XP history fetched: {len(data_points)} days, {total_gained} total XP gained")

        response = XPHistoryResponse(
            data_points=data_points,
            total_xp_gained=total_gained,
            days_tracked=days
        )
        
        # Cache for 5 minutes
        cache_data = convert_datetime_for_cache(response.model_dump())
        cache_set(cache_key, cache_data, ttl=settings.CACHE_TTL_ANALYTICS)
        
        return response

    except PostgreSQLError as e:
        logger.error(f"Database error in get_xp_history: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()

# ===================================
# GET /me/analytics/quiz-performance
# ===================================
@router.get("/analytics/quiz-performance", response_model=QuizPerformanceTrendResponse)
def get_quiz_performance_trend(
    limit: int = 20,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get quiz performance trend (last N quizzes)

    Shows performance over time with trend analysis
    """
    # Check cache
    cache_key = f"quiz_performance:{user_id}:{limit}"
    cached = cache_get(cache_key)
    if cached:
        return QuizPerformanceTrendResponse(**cached)
    
    cursor = get_dict_cursor(db)

    try:
        logger.info(f"Fetching quiz performance trend for user {user_id} (limit: {limit})")

        # Get recent quiz submissions with scores
        query = """
            SELECT
                s.id as submission_id,
                q.id as quiz_id,
                q.title as quiz_title,
                t.name as topic_name,
                (s.total_score / s.max_score * 100) as score_percentage,
                s.submitted_at
            FROM submissions s
            JOIN quizzes q ON s.quiz_id = q.id
            JOIN topics t ON q.subject_id = t.id
            WHERE s.user_id = %s AND s.max_score > 0
            ORDER BY s.submitted_at DESC
            LIMIT %s
        """

        cursor.execute(query, (user_id, limit))
        rows = cursor.fetchall()

        performances = []
        scores = []

        for row in rows:
            score_pct = round(float(row['score_percentage']), 2)
            scores.append(score_pct)

            performances.append(QuizPerformanceDataPoint(
                quiz_id=row['quiz_id'],
                quiz_title=row['quiz_title'],
                topic_name=row['topic_name'],
                score_percentage=score_pct,
                submitted_at=row['submitted_at']
            ))

        # Reverse to show oldest first for trend calculation
        performances.reverse()
        scores.reverse()

        # Calculate trend
        avg_score = sum(scores) / len(scores) if scores else 0.0
        trend = "stable"

        if len(scores) >= 3:
            # Compare first third vs last third
            first_third = scores[:len(scores)//3]
            last_third = scores[-len(scores)//3:]

            avg_first = sum(first_third) / len(first_third)
            avg_last = sum(last_third) / len(last_third)

            if avg_last > avg_first + 5:
                trend = "improving"
            elif avg_last < avg_first - 5:
                trend = "declining"

        logger.info(f"Quiz performance trend: {len(performances)} quizzes, avg {avg_score:.1f}%, trend: {trend}")

        response = QuizPerformanceTrendResponse(
            performances=performances,
            average_score=round(avg_score, 2),
            total_quizzes=len(performances),
            trend=trend
        )
        
        # Cache for 5 minutes
        cache_data = convert_datetime_for_cache(response.model_dump())
        cache_set(cache_key, cache_data, ttl=settings.CACHE_TTL_ANALYTICS)
        
        return response

    except PostgreSQLError as e:
        logger.error(f"Database error in get_quiz_performance_trend: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()

# ===================================
# GET /me/analytics/activity-summary
# ===================================
@router.get("/analytics/activity-summary", response_model=ActivitySummaryResponse)
def get_activity_summary(
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get comprehensive activity summary

    Returns overall activity stats and recent activities
    """
    # Check cache first
    cache_key = f"analytics:activity_summary:{user_id}"
    cached = cache_get(cache_key)
    if cached:
        logger.info(f"🎯 Cache HIT for activity summary: {user_id}")
        return ActivitySummaryResponse(**cached)
    
    logger.info(f"💾 Cache MISS for activity summary: {user_id}")
    cursor = get_dict_cursor(db)

    try:
        logger.info(f"Fetching activity summary for user {user_id}")

        # Count total chat messages
        cursor.execute("""
            SELECT COUNT(*) as total
            FROM chat_messages cm
            JOIN chat_sessions cs ON cm.session_id = cs.id
            WHERE cs.user_id = %s AND cm.role = 'user'
        """, (user_id,))
        total_messages = cursor.fetchone()['total']

        # Count total documents
        cursor.execute("""
            SELECT COUNT(*) as total
            FROM documents
            WHERE owner_id = %s
        """, (user_id,))
        total_docs = cursor.fetchone()['total']

        # Count total quizzes
        cursor.execute("""
            SELECT COUNT(DISTINCT quiz_id) as total
            FROM submissions
            WHERE user_id = %s
        """, (user_id,))
        total_quizzes = cursor.fetchone()['total']

        # Count study days (days with submissions or messages)
        cursor.execute("""
            SELECT COUNT(DISTINCT activity_date) as total FROM (
                SELECT DATE(submitted_at) as activity_date
                FROM submissions WHERE user_id = %s
                UNION
                SELECT DATE(cm.created_at) as activity_date
                FROM chat_messages cm
                JOIN chat_sessions cs ON cm.session_id = cs.id
                WHERE cs.user_id = %s AND cm.role = 'user'
            ) as activities
        """, (user_id, user_id))
        study_days = cursor.fetchone()['total']

        # Get most active topic (by quiz count)
        cursor.execute("""
            SELECT t.name, COUNT(*) as quiz_count
            FROM submissions s
            JOIN quizzes q ON s.quiz_id = q.id
            JOIN topics t ON q.subject_id = t.id
            WHERE s.user_id = %s
            GROUP BY t.id, t.name
            ORDER BY quiz_count DESC
            LIMIT 1
        """, (user_id,))
        most_active_row = cursor.fetchone()
        most_active_topic = most_active_row['name'] if most_active_row else None

        # Get streak record (current streak from gamification table)
        cursor.execute("""
            SELECT streak FROM gamification WHERE user_id = %s
        """, (user_id,))
        streak_row = cursor.fetchone()
        streak_record = streak_row['streak'] if streak_row else 0

        # Get recent activities (last 10)
        recent_activities = []

        # Recent quizzes
        cursor.execute("""
            SELECT 'quiz' as type, q.title, t.name as topic, s.submitted_at as timestamp
            FROM submissions s
            JOIN quizzes q ON s.quiz_id = q.id
            JOIN topics t ON q.subject_id = t.id
            WHERE s.user_id = %s
            ORDER BY s.submitted_at DESC
            LIMIT 5
        """, (user_id,))
        quiz_activities = cursor.fetchall()

        for act in quiz_activities:
            recent_activities.append({
                "type": "quiz",
                "description": f"Completed quiz: {act['title']}",
                "topic": act['topic'],
                "timestamp": act['timestamp'].isoformat()
            })

        # Recent documents
        cursor.execute("""
            SELECT 'document' as type, d.title, t.name as topic, d.created_at as timestamp
            FROM documents d
            JOIN topics t ON d.subject_id = t.id
            WHERE d.owner_id = %s
            ORDER BY d.created_at DESC
            LIMIT 5
        """, (user_id,))
        doc_activities = cursor.fetchall()

        for act in doc_activities:
            recent_activities.append({
                "type": "document",
                "description": f"Uploaded document: {act['title']}",
                "topic": act['topic'],
                "timestamp": act['timestamp'].isoformat()
            })

        # Sort by timestamp and limit to 10
        recent_activities.sort(key=lambda x: x['timestamp'], reverse=True)
        recent_activities = recent_activities[:10]

        logger.info(f"Activity summary: {total_messages} messages, {total_docs} docs, {total_quizzes} quizzes")

        response = ActivitySummaryResponse(
            summary=ActivitySummary(
                total_chat_messages=total_messages,
                total_documents_uploaded=total_docs,
                total_quizzes_taken=total_quizzes,
                total_study_days=study_days,
                most_active_topic=most_active_topic,
                study_streak_record=streak_record
            ),
            recent_activities=recent_activities
        )
        
        # Cache the response
        cache_data = convert_datetime_for_cache(response.model_dump())
        cache_set(cache_key, cache_data, ttl=settings.CACHE_TTL_ANALYTICS)
        logger.info(f"✅ Cached activity summary for user {user_id}")
        
        return response

    except PostgreSQLError as e:
        logger.error(f"Database error in get_activity_summary: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()

# ===================================
# GET /me/analytics/daily-activity
# ===================================
@router.get("/analytics/daily-activity", response_model=DailyActivityResponse)
def get_daily_activity(
    days: int = 90,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get daily activity data for heatmap calendar (default last 90 days)
    
    Returns activity count per day (quiz submissions + chat messages + document uploads)
    """
    # Check cache first
    cache_key = f"analytics:daily_activity:{user_id}:{days}"
    cached = cache_get(cache_key)
    if cached:
        logger.info(f"🎯 Cache HIT for daily activity: {user_id} ({days} days)")
        return DailyActivityResponse(**cached)
    
    logger.info(f"💾 Cache MISS for daily activity: {user_id} ({days} days)")
    cursor = get_dict_cursor(db)
    
    try:
        logger.info(f"Fetching daily activity for user {user_id} (last {days} days)")
        
        # Get date range
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days-1)
        
        # Get daily quiz submissions
        cursor.execute("""
            SELECT DATE(submitted_at) as activity_date, COUNT(*) as count
            FROM submissions
            WHERE user_id = %s
                AND submitted_at >= %s
                AND submitted_at <= %s
            GROUP BY DATE(submitted_at)
        """, (user_id, start_date, end_date))
        quiz_data = {row['activity_date']: row['count'] for row in cursor.fetchall()}
        
        # Get daily chat messages
        cursor.execute("""
            SELECT DATE(cm.created_at) as activity_date, COUNT(*) as count
            FROM chat_messages cm
            JOIN chat_sessions cs ON cm.session_id = cs.id
            WHERE cs.user_id = %s
                AND cm.role = 'user'
                AND cm.created_at >= %s
                AND cm.created_at <= %s
            GROUP BY DATE(cm.created_at)
        """, (user_id, start_date, end_date))
        message_data = {row['activity_date']: row['count'] for row in cursor.fetchall()}
        
        # Get daily document uploads
        cursor.execute("""
            SELECT DATE(created_at) as activity_date, COUNT(*) as count
            FROM documents
            WHERE owner_id = %s
                AND created_at >= %s
                AND created_at <= %s
            GROUP BY DATE(created_at)
        """, (user_id, start_date, end_date))
        upload_data = {row['activity_date']: row['count'] for row in cursor.fetchall()}
        
        # Build daily activity list
        activities = []
        total_count = 0
        
        current_date = start_date
        while current_date <= end_date:
            quizzes = quiz_data.get(current_date, 0)
            messages = message_data.get(current_date, 0)
            uploads = upload_data.get(current_date, 0)
            activity_count = quizzes + messages + uploads
            
            activities.append(DailyActivity(
                date=current_date.isoformat(),
                activity_count=activity_count,
                quizzes=quizzes,
                messages=messages,
                uploads=uploads
            ))
            
            total_count += activity_count
            current_date += timedelta(days=1)
        
        logger.info(f"Daily activity fetched: {len(activities)} days, {total_count} total activities")
        
        response = DailyActivityResponse(
            activities=activities,
            days_tracked=days,
            total_activity_count=total_count
        )
        
        # Cache the response
        cache_data = convert_datetime_for_cache(response.model_dump())
        cache_set(cache_key, cache_data, ttl=settings.CACHE_TTL_ANALYTICS)
        logger.info(f"✅ Cached daily activity for user {user_id} ({days} days)")
        
        return response
        
    except PostgreSQLError as e:
        logger.error(f"Database error in get_daily_activity: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()

# Temporary file - append this to gamification.py at the end

# ===================================
# GET /me/dashboard - Combined endpoint
# ===================================
@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(user_id: str = Depends(get_current_user), db = Depends(get_db)):
    """
    Get all dashboard data in single request
    
    Combines:
    - /me/stats
    - /me/progress  
    - /me/topic-understanding
    - /topics
    """
    # Check cache first
    cache_key = f"dashboard:{user_id}"
    cached = cache_get(cache_key)
    if cached:
        return DashboardResponse(**cached)
    
    try:
        # Get stats
        stats = get_my_stats(user_id, db)
        
        # Get progress
        progress = get_my_progress(user_id, db)
        
        # Get topic understanding
        topic_understanding = get_topic_understanding(user_id, db)
        
        # Get topics (create cursor only for this part)
        cursor = get_dict_cursor(db)
        cursor.execute(
            """
            SELECT id, name, description, created_at
            FROM topics
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )
        topics = cursor.fetchall()
        cursor.close()
        
        response = DashboardResponse(
            stats=stats,
            progress=progress,
            topic_understanding=topic_understanding,
            topics=topics
        )
        
        # Cache the response
        cache_data = convert_datetime_for_cache(response.model_dump())
        cache_set(cache_key, cache_data, ttl=settings.CACHE_TTL_DASHBOARD)
        
        return response
        
    except Exception as e:
        logger.error(f"Error in get_dashboard: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dashboard: {str(e)}"
        )


