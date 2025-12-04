"""
XP Calculator - Replace-based XP system
Calculates XP based on quiz score improvement
"""

from psycopg2.extras import RealDictCursor


def calculate_xp_from_score(score_percentage: float) -> int:
    """
    Calculate XP based on quiz score percentage (replace-based system)

    Score Tiers:
    - < 50%: 0 XP (must pass threshold)
    - 50-69%: 20 XP
    - 70-89%: 35 XP
    - 90-99%: 50 XP
    - 100%: 60 XP

    Args:
        score_percentage: Score as percentage (0.0 to 100.0)

    Returns:
        XP amount (int)
    """
    if score_percentage < 50:
        return 0
    elif score_percentage < 70:
        return 20
    elif score_percentage < 90:
        return 35
    elif score_percentage < 100:
        return 50
    else:  # 100%
        return 60


def calculate_quiz_xp_delta(
    user_id: str,
    quiz_id: str,
    new_score: float,
    db_connection
) -> dict:
    """
    Calculate XP gain based on improvement (replace-based)

    Logic:
    - First attempt: Award XP based on score tier
    - Subsequent attempts: Only award XP if score improves
    - XP delta = new_xp - old_xp (can be positive if improvement)
    - Track best score and total attempts in quiz_best_scores table

    Args:
        user_id: User UUID
        quiz_id: Quiz UUID
        new_score: New score percentage (0-100)
        db_connection: PostgreSQL connection

    Returns:
        {
            'xp_earned': int,          # Net XP gain (delta)
            'new_total_xp': int,       # User's new total XP
            'is_improvement': bool,    # Whether this improves best score
            'best_score': float,       # New or existing best score
            'attempt_number': int,     # Nth attempt for this quiz
            'score_breakdown': {
                'current_score': float,
                'previous_best': float or None,
                'xp_from_current': int,
                'xp_from_previous': int
            }
        }
    """
    cursor = db_connection.cursor(cursor_factory=RealDictCursor)

    try:
        # Get previous best score for this quiz
        cursor.execute("""
            SELECT best_score, best_xp_earned, total_attempts
            FROM quiz_best_scores
            WHERE user_id = %s AND quiz_id = %s
        """, (user_id, quiz_id))

        previous = cursor.fetchone()

        # Calculate XP for new score
        new_xp = calculate_xp_from_score(new_score)

        if previous is None:
            # First attempt - insert new record
            xp_delta = new_xp
            is_improvement = True
            attempt_number = 1
            best_score = new_score

            cursor.execute("""
                INSERT INTO quiz_best_scores
                (user_id, quiz_id, best_score, best_xp_earned, total_attempts)
                VALUES (%s, %s, %s, %s, 1)
            """, (user_id, quiz_id, new_score, new_xp))

            previous_best = None
            previous_xp = 0

        else:
            # Subsequent attempt
            attempt_number = previous['total_attempts'] + 1
            old_best_score = float(previous['best_score'])
            old_best_xp = previous['best_xp_earned']

            if new_score > old_best_score:
                # Improvement! Replace old XP
                xp_delta = new_xp - old_best_xp
                is_improvement = True
                best_score = new_score

                # Update best score
                cursor.execute("""
                    UPDATE quiz_best_scores
                    SET best_score = %s,
                        best_xp_earned = %s,
                        total_attempts = %s,
                        last_attempt_at = NOW(),
                        updated_at = NOW()
                    WHERE user_id = %s AND quiz_id = %s
                """, (new_score, new_xp, attempt_number, user_id, quiz_id))

            else:
                # No improvement - just update attempt count
                xp_delta = 0
                is_improvement = False
                best_score = old_best_score

                cursor.execute("""
                    UPDATE quiz_best_scores
                    SET total_attempts = %s,
                        last_attempt_at = NOW(),
                        updated_at = NOW()
                    WHERE user_id = %s AND quiz_id = %s
                """, (attempt_number, user_id, quiz_id))

            previous_best = old_best_score
            previous_xp = old_best_xp

        # Update user's total XP (only if there's a delta)
        if xp_delta != 0:
            cursor.execute("""
                UPDATE gamification
                SET xp = xp + %s
                WHERE user_id = %s
                RETURNING xp
            """, (xp_delta, user_id))
            result = cursor.fetchone()
            new_total_xp = result['xp'] if result else 0
        else:
            # No XP change, just fetch current XP
            cursor.execute("SELECT xp FROM gamification WHERE user_id = %s", (user_id,))
            result = cursor.fetchone()
            new_total_xp = result['xp'] if result else 0

        db_connection.commit()

        return {
            'xp_earned': xp_delta,
            'new_total_xp': new_total_xp,
            'is_improvement': is_improvement,
            'best_score': best_score,
            'attempt_number': attempt_number,
            'score_breakdown': {
                'current_score': new_score,
                'previous_best': previous_best,
                'xp_from_current': new_xp,
                'xp_from_previous': previous_xp
            }
        }

    finally:
        cursor.close()
