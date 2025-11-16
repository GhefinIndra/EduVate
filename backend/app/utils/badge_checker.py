import json
from datetime import date, timedelta, datetime

# ===================================
# Badge Definitions
# ===================================
BADGE_DEFINITIONS = {
    "first_steps": {
        "name": "First Steps",
        "description": "Upload dokumen pertama",
        "icon": "📚"
    },
    "curious_mind": {
        "name": "Curious Mind",
        "description": "Kirim 10 pesan chat",
        "icon": "🤔"
    },
    "quiz_novice": {
        "name": "Quiz Novice",
        "description": "Selesaikan quiz pertama",
        "icon": "📝"
    },
    "quiz_master": {
        "name": "Quiz Master",
        "description": "Selesaikan 5 quiz",
        "icon": "🎓"
    },
    "perfect_score": {
        "name": "Perfect Score",
        "description": "Dapat nilai 100% di quiz",
        "icon": "💯"
    },
    "week_warrior": {
        "name": "Week Warrior",
        "description": "Streak 7 hari berturut-turut",
        "icon": "🔥"
    },
    "scholar": {
        "name": "Scholar",
        "description": "Capai level 10",
        "icon": "👨‍🎓"
    }
}

# ===================================
# Update Streak
# ===================================
def update_streak(user_id: str, db):
    """
    Update streak berdasarkan last_activity
    
    Logic:
    - First activity: streak = 1
    - Same day: no change
    - Yesterday: streak + 1
    - Skip days: reset to 1
    """
    cursor = db.cursor(dictionary=True)
    
    try:
        # Get current streak & last_activity
        cursor.execute(
            "SELECT streak, last_activity FROM gamification WHERE user_id = %s",
            (user_id,)
        )
        row = cursor.fetchone()
        
        if not row:
            return  # User doesn't exist
        
        current_streak = row['streak'] or 0
        last_activity = row['last_activity']  # date object or None
        today = date.today()
        
        # Determine new streak
        if last_activity is None:
            # First activity ever
            new_streak = 1
        elif last_activity == today:
            # Already active today, no change
            new_streak = current_streak
        elif last_activity == today - timedelta(days=1):
            # Active yesterday, continue streak
            new_streak = current_streak + 1
        else:
            # Skip 1+ days, reset streak
            new_streak = 1
        
        # Update streak & last_activity
        cursor.execute("""
            UPDATE gamification 
            SET streak = %s, last_activity = %s 
            WHERE user_id = %s
        """, (new_streak, today, user_id))
        
        db.commit()
        
    finally:
        cursor.close()

# ===================================
# Check & Unlock Badges
# ===================================
def check_and_unlock_badges(user_id: str, db):
    """
    Check badge conditions & unlock yang baru
    
    Returns: List of newly unlocked badge IDs
    """
    cursor = db.cursor(dictionary=True)
    newly_unlocked = []
    
    try:
        # 1. Get current badges (JSON array)
        cursor.execute(
            "SELECT badges, streak, level FROM gamification WHERE user_id = %s",
            (user_id,)
        )
        row = cursor.fetchone()
        
        if not row:
            return []
        
        # Parse existing badges
        badges_json = row['badges'] or '[]'
        existing_badges = json.loads(badges_json) if isinstance(badges_json, str) else badges_json
        unlocked_badge_ids = [b['id'] for b in existing_badges]
        
        streak = row['streak'] or 0
        level = row['level'] or 1
        
        # 2. Get user stats (untuk check conditions)
        cursor.execute(
            "SELECT COUNT(*) as total_documents FROM documents WHERE owner_id = %s",
            (user_id,)
        )
        total_documents = cursor.fetchone()['total_documents']
        
        cursor.execute(
            "SELECT COUNT(*) as total_messages FROM chat_messages cm "
            "JOIN chat_sessions cs ON cm.session_id = cs.id "
            "WHERE cs.user_id = %s AND cm.role = 'user'",
            (user_id,)
        )
        total_messages = cursor.fetchone()['total_messages']
        
        cursor.execute(
            "SELECT COUNT(*) as total_quizzes FROM submissions WHERE user_id = %s",
            (user_id,)
        )
        total_quizzes = cursor.fetchone()['total_quizzes']
        
        cursor.execute(
            "SELECT COUNT(*) as perfect_count FROM submissions "
            "WHERE user_id = %s AND total_score = max_score AND max_score > 0",
            (user_id,)
        )
        has_perfect_score = cursor.fetchone()['perfect_count'] > 0
        
        # 3. Check each badge condition
        conditions = {
            "first_steps": total_documents >= 1,
            "curious_mind": total_messages >= 10,
            "quiz_novice": total_quizzes >= 1,
            "quiz_master": total_quizzes >= 5,
            "perfect_score": has_perfect_score,
            "week_warrior": streak >= 7,
            "scholar": level >= 10
        }
        
        # 4. Unlock badges that meet conditions
        for badge_id, condition_met in conditions.items():
            if condition_met and badge_id not in unlocked_badge_ids:
                # Unlock this badge!
                new_badge = {
                    "id": badge_id,
                    "unlocked_at": datetime.now().isoformat()
                }
                existing_badges.append(new_badge)
                newly_unlocked.append(badge_id)
        
        # 5. Update database if new badges unlocked
        if newly_unlocked:
            cursor.execute("""
                UPDATE gamification 
                SET badges = %s 
                WHERE user_id = %s
            """, (json.dumps(existing_badges), user_id))
            db.commit()
        
        return newly_unlocked
        
    finally:
        cursor.close()

# ===================================
# Get All Badges (Unlocked + Locked)
# ===================================
def get_all_badges(user_id: str, db):
    """
    Get semua badges dengan status unlocked/locked
    
    Returns: List of badge objects dengan info lengkap
    """
    cursor = db.cursor(dictionary=True)
    
    try:
        cursor.execute(
            "SELECT badges FROM gamification WHERE user_id = %s",
            (user_id,)
        )
        row = cursor.fetchone()
        
        if not row:
            return []
        
        # Parse unlocked badges
        badges_json = row['badges'] or '[]'
        unlocked_badges = json.loads(badges_json) if isinstance(badges_json, str) else badges_json
        unlocked_dict = {b['id']: b['unlocked_at'] for b in unlocked_badges}
        
        # Build complete badge list
        all_badges = []
        for badge_id, badge_info in BADGE_DEFINITIONS.items():
            all_badges.append({
                "id": badge_id,
                "name": badge_info["name"],
                "description": badge_info["description"],
                "icon": badge_info["icon"],
                "unlocked_at": unlocked_dict.get(badge_id)  # None if not unlocked
            })
        
        return all_badges
        
    finally:
        cursor.close()
