from fastapi import APIRouter, Depends, HTTPException, status
from mysql.connector import Error as MySQLError
import json
from datetime import datetime

from app.models.gamification import ProgressResponse, StatsResponse, BadgeInfo, DocumentUnderstandingResponse, DocumentUnderstanding, TopicUnderstandingResponse, TopicUnderstanding
from app.database import get_db
from app.auth import get_current_user
from app.utils.badge_checker import get_all_badges, check_and_unlock_badges, update_streak
from app.utils.insight_generator import generate_topic_insight

router = APIRouter(prefix="/me", tags=["Gamification"])

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
    cursor = db.cursor(dictionary=True)
    
    try:
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
        
    except MySQLError as e:
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
    cursor = db.cursor(dictionary=True)
    
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
        
        return StatsResponse(
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
        
    except MySQLError as e:
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
    cursor = db.cursor(dictionary=True)
    
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

    except MySQLError as e:
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
    cursor = db.cursor(dictionary=True)

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
            HAVING total_quizzes > 0
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

        return TopicUnderstandingResponse(topics=topics)

    except MySQLError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        cursor.close()