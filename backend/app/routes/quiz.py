from fastapi import APIRouter, Depends, HTTPException, status
from mysql.connector import Error as MySQLError
import uuid
import json
from typing import List

from app.models.quiz import (
    GenerateQuizRequest, QuizResponse, QuestionResponse,
    SubmitAnswerRequest, SubmissionResponse, QuestionFeedback,
    QuizHistoryResponse, QuizHistoryItem, QuizListResponse, QuizListItem
)
from app.database import get_db
from app.auth import get_current_user
from app.utils.quiz_generator import generate_quiz_from_document
from app.utils.grader import grade_submission
from app.utils.badge_checker import update_streak, check_and_unlock_badges
from app.routes.gamification import calculate_level_from_xp

router = APIRouter(prefix="/quiz", tags=["Quiz"])

@router.post("/generate", response_model=QuizResponse)
def generate_quiz(
    request: GenerateQuizRequest,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Generate quiz dari dokumen
    
    Flow:
    1. Verify document exists & owned by user
    2. Generate questions dengan Gemini
    3. Save quiz & questions ke DB
    4. Return quiz dengan questions
    """
    cursor = db.cursor(dictionary=True)
    
    try:
        # 1. Verify topic exists
        cursor.execute(
            "SELECT id, name FROM topics WHERE id = %s AND user_id = %s",
            (request.subject_id, user_id)
        )
        topic = cursor.fetchone()

        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not found"
            )

        # 2. Generate questions dari semua docs dalam topic (multi-doc quiz)
        questions = generate_quiz_from_document(
            doc_id=request.subject_id,  # Pass subject_id (quiz_generator akan retrieve dari subject)
            n_mcq=request.n_mcq,
            n_essay=request.n_essay
        )
        
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to generate quiz"
            )
        
        # 3. Save quiz
        quiz_id = str(uuid.uuid4())
        quiz_title = f"Quiz - {topic['name']}"

        cursor.execute(
            """
            INSERT INTO quizzes (id, user_id, subject_id, title, total_questions)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (quiz_id, user_id, request.subject_id, quiz_title, len(questions))
        )
        
        # 4. Save questions
        question_responses = []
        for q in questions:
            q_id = str(uuid.uuid4())
            
            # Convert lists to JSON
            options_json = json.dumps(q.get('options')) if q['type'] == 'MCQ' else None
            rubric_json = json.dumps(q.get('rubric_keywords')) if q['type'] == 'ESSAY' else None
            
            cursor.execute(
                """
                INSERT INTO questions (id, quiz_id, type, question, options, correct_answer, rubric_keywords, page_reference, points)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    q_id,
                    quiz_id,
                    q['type'],
                    q['question'],
                    options_json,
                    q.get('correct_answer'),
                    rubric_json,
                    q.get('page_reference'),
                    q['points']
                )
            )
            
            question_responses.append(QuestionResponse(
                id=q_id,
                type=q['type'],
                question=q['question'],
                options=q.get('options'),
                page_reference=q.get('page_reference'),
                points=q['points']
            ))
        
        db.commit()
        
        # 5. Get created quiz
        cursor.execute(
            "SELECT id, title, subject_id, total_questions, created_at FROM quizzes WHERE id = %s",
            (quiz_id,)
        )
        quiz = cursor.fetchone()

        return QuizResponse(
            quiz_id=quiz['id'],
            title=quiz['title'],
            subject_id=quiz['subject_id'],
            total_questions=quiz['total_questions'],
            questions=question_responses,
            created_at=quiz['created_at']
        )
        
    except MySQLError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )
    finally:
        cursor.close()

@router.get("", response_model=QuizListResponse)
def list_quizzes(
    subject_id: str = None,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get all quizzes for user (optionally filter by subject_id)
    """
    cursor = db.cursor(dictionary=True)

    try:
        if subject_id:
            # Filter by subject
            cursor.execute(
                """
                SELECT
                    q.id, q.title, q.subject_id, q.total_questions, q.created_at,
                    s.id as submission_id, s.total_score, s.max_score, s.submitted_at
                FROM quizzes q
                LEFT JOIN submissions s ON q.id = s.quiz_id
                WHERE q.user_id = %s AND q.subject_id = %s
                ORDER BY q.created_at DESC
                """,
                (user_id, subject_id)
            )
        else:
            # All quizzes
            cursor.execute(
                """
                SELECT
                    q.id, q.title, q.subject_id, q.total_questions, q.created_at,
                    s.id as submission_id, s.total_score, s.max_score, s.submitted_at
                FROM quizzes q
                LEFT JOIN submissions s ON q.id = s.quiz_id
                WHERE q.user_id = %s
                ORDER BY q.created_at DESC
                """,
                (user_id,)
            )

        quizzes_raw = cursor.fetchall()

        # Group by quiz_id (in case multiple submissions)
        quizzes_dict = {}
        for row in quizzes_raw:
            quiz_id = row['id']
            if quiz_id not in quizzes_dict:
                quizzes_dict[quiz_id] = {
                    'id': row['id'],
                    'title': row['title'],
                    'subject_id': row['subject_id'],
                    'total_questions': row['total_questions'],
                    'created_at': row['created_at'],
                    'submitted_at': row['submitted_at'],
                    'score': None
                }

            # Use latest submission
            if row['submission_id']:
                score_percentage = round((row['total_score'] / row['max_score']) * 100, 2) if row['max_score'] > 0 else 0
                quizzes_dict[quiz_id]['score'] = score_percentage
                quizzes_dict[quiz_id]['submitted_at'] = row['submitted_at']

        # Convert to list
        quizzes = list(quizzes_dict.values())

        # Map to QuizListItem format
        quiz_items = []
        for quiz in quizzes:
            quiz_items.append(QuizListItem(
                id=quiz['id'],
                title=quiz['title'],
                subject_id=quiz['subject_id'],
                total_questions=quiz['total_questions'],
                created_at=quiz['created_at'],
                submitted_at=quiz['submitted_at'],
                score=quiz['score']
            ))

        return QuizListResponse(
            quizzes=quiz_items,
            total=len(quiz_items)
        )

    finally:
        cursor.close()

@router.get("/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    quiz_id: str,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get quiz questions for taking/retaking (no answers included)
    """
    cursor = db.cursor(dictionary=True)

    try:
        # Get quiz
        cursor.execute(
            """
            SELECT id, title, doc_id, subject_id, total_questions, created_at
            FROM quizzes
            WHERE id = %s AND user_id = %s
            """,
            (quiz_id, user_id)
        )
        quiz = cursor.fetchone()

        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )

        # Get questions (without correct_answer for taking quiz)
        cursor.execute(
            """
            SELECT id, type, question, options, page_reference, points
            FROM questions
            WHERE quiz_id = %s
            ORDER BY type DESC, id
            """,
            (quiz_id,)
        )
        questions = cursor.fetchall()

        question_responses = []
        for q in questions:
            # Parse JSON options
            options = json.loads(q['options']) if q['options'] else None

            # Convert list format to dict format (backward compatibility)
            if options and isinstance(options, list):
                options = {chr(65 + i): opt for i, opt in enumerate(options)}

            question_responses.append(QuestionResponse(
                id=q['id'],
                type=q['type'],
                question=q['question'],
                options=options,
                correct_answer=None,  # Don't show correct answer when taking quiz
                page_reference=q['page_reference'],
                points=q['points'],
                ai_feedback=None
            ))

        return QuizResponse(
            quiz_id=quiz['id'],
            title=quiz['title'],
            subject_id=quiz['subject_id'],
            total_questions=quiz['total_questions'],
            questions=question_responses,
            created_at=quiz['created_at'],
            submitted_at=None,
            user_answers=None,
            score=None
        )
        
    finally:
        cursor.close()

@router.get("/{quiz_id}/submissions", response_model=QuizHistoryResponse)
def get_quiz_submissions(
    quiz_id: str,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get all submissions/attempts for a specific quiz
    """
    cursor = db.cursor(dictionary=True)

    try:
        # Verify quiz exists and owned by user
        cursor.execute(
            "SELECT id, title FROM quizzes WHERE id = %s AND user_id = %s",
            (quiz_id, user_id)
        )
        quiz = cursor.fetchone()

        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )

        # Get all submissions for this quiz
        cursor.execute(
            """
            SELECT id, quiz_id, total_score, max_score, submitted_at
            FROM submissions
            WHERE quiz_id = %s AND user_id = %s
            ORDER BY submitted_at DESC
            """,
            (quiz_id, user_id)
        )
        submissions = cursor.fetchall()

        history_items = []
        for sub in submissions:
            percentage = round((sub['total_score'] / sub['max_score']) * 100, 2) if sub['max_score'] > 0 else 0

            history_items.append(QuizHistoryItem(
                submission_id=sub['id'],
                quiz_id=sub['quiz_id'],
                quiz_title=quiz['title'],
                score=sub['total_score'],
                max_score=sub['max_score'],
                percentage=percentage,
                submitted_at=sub['submitted_at']
            ))

        return QuizHistoryResponse(
            submissions=history_items,
            total=len(history_items)
        )

    finally:
        cursor.close()

@router.get("/submission/{submission_id}", response_model=QuizResponse)
def get_submission_detail(
    submission_id: str,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get submission detail for review (with answers and feedback)
    """
    cursor = db.cursor(dictionary=True)

    try:
        # Get submission
        cursor.execute(
            """
            SELECT s.id, s.quiz_id, s.total_score, s.max_score, s.submitted_at,
                   q.title, q.subject_id, q.total_questions, q.created_at
            FROM submissions s
            JOIN quizzes q ON s.quiz_id = q.id
            WHERE s.id = %s AND s.user_id = %s
            """,
            (submission_id, user_id)
        )
        submission = cursor.fetchone()

        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )

        # Get questions with user answers
        cursor.execute(
            """
            SELECT q.id, q.type, q.question, q.options, q.correct_answer,
                   q.page_reference, q.points,
                   sa.user_answer, sa.feedback
            FROM questions q
            LEFT JOIN submission_answers sa ON q.id = sa.question_id AND sa.submission_id = %s
            WHERE q.quiz_id = %s
            ORDER BY q.type DESC, q.id
            """,
            (submission_id, submission['quiz_id'])
        )
        questions = cursor.fetchall()

        score = round((submission['total_score'] / submission['max_score']) * 100, 2) if submission['max_score'] > 0 else 0
        user_answers_dict = {}
        question_responses = []

        for q in questions:
            # Parse JSON options
            options = json.loads(q['options']) if q['options'] else None

            # Convert list format to dict format (backward compatibility)
            if options and isinstance(options, list):
                options = {chr(65 + i): opt for i, opt in enumerate(options)}

            if q['user_answer']:
                user_answers_dict[q['id']] = q['user_answer']

            question_responses.append(QuestionResponse(
                id=q['id'],
                type=q['type'],
                question=q['question'],
                options=options,
                correct_answer=q['correct_answer'],
                page_reference=q['page_reference'],
                points=q['points'],
                ai_feedback=q['feedback']
            ))

        return QuizResponse(
            quiz_id=submission['quiz_id'],
            title=submission['title'],
            subject_id=submission['subject_id'],
            total_questions=submission['total_questions'],
            questions=question_responses,
            created_at=submission['created_at'],
            submitted_at=submission['submitted_at'],
            user_answers=user_answers_dict,
            score=score
        )

    finally:
        cursor.close()

@router.post("/{quiz_id}/submit", response_model=SubmissionResponse)
def submit_quiz(
    quiz_id: str,
    request: SubmitAnswerRequest,
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Submit quiz answers & get grading
    
    Flow:
    1. Verify quiz exists
    2. Get all questions (dengan correct_answer & rubric)
    3. Grade submission (MCQ + Essay)
    4. Save submission & answers
    5. Update XP (gamification)
    6. Return grading result
    """
    cursor = db.cursor(dictionary=True)
    
    try:
        # 1. Verify quiz
        cursor.execute(
            "SELECT id FROM quizzes WHERE id = %s",
            (quiz_id,)
        )
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quiz not found"
            )
        
        # 2. Get questions dengan jawaban/rubric
        cursor.execute(
            """
            SELECT id, type, question, options, correct_answer, rubric_keywords, points
            FROM questions
            WHERE quiz_id = %s
            """,
            (quiz_id,)
        )
        questions_raw = cursor.fetchall()
        
        # Parse JSON fields & add to questions
        questions = []
        for q in questions_raw:
            q['options'] = json.loads(q['options']) if q['options'] else None
            q['rubric_keywords'] = json.loads(q['rubric_keywords']) if q['rubric_keywords'] else None
            questions.append(q)
        
        # 3. Grade submission
        grading_result = grade_submission(questions, request.answers)
        
        # 4. Save submission
        submission_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO submissions (id, quiz_id, user_id, total_score, max_score)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (submission_id, quiz_id, user_id, grading_result['total_score'], grading_result['max_score'])
        )
        
        # 5. Save answers
        feedback_list = []
        for detail in grading_result['details']:
            answer_id = str(uuid.uuid4())
            
            # Find original question
            question = next(q for q in questions if q['id'] == detail['question_id'])
            
            # Find user answer
            user_ans = next((a['answer'] for a in request.answers if a['question_id'] == detail['question_id']), "")
            
            cursor.execute(
                """
                INSERT INTO submission_answers (id, submission_id, question_id, user_answer, is_correct, score, feedback)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    answer_id,
                    submission_id,
                    detail['question_id'],
                    user_ans,
                    detail.get('is_correct'),
                    detail['score'],
                    detail['feedback']
                )
            )
            
            feedback_list.append(QuestionFeedback(
                question_id=detail['question_id'],
                question=question['question'],
                user_answer=user_ans,
                is_correct=detail.get('is_correct'),
                score=detail['score'],
                max_points=question['points'],
                feedback=detail['feedback']
            ))
        
        # 6. Update XP (simple: +20 for completing quiz, +5 per correct MCQ)
        xp_earned = 20  # Base XP for completing
        for detail in grading_result['details']:
            if detail['type'] == 'MCQ' and detail.get('is_correct'):
                xp_earned += 5
            elif detail['type'] == 'ESSAY' and detail['score'] >= (question['points'] * 0.8):
                xp_earned += 10
        
        # Calculate XP & new level (Exponential - Opsi B)
        # Get current XP
        cursor.execute("SELECT xp FROM gamification WHERE user_id = %s", (user_id,))
        current_xp = cursor.fetchone()['xp'] or 0
        new_xp = current_xp + xp_earned
        new_level = calculate_level_from_xp(new_xp)

        # Update gamification
        cursor.execute(
            """
            UPDATE gamification
            SET xp = %s,
                level = %s
            WHERE user_id = %s
            """,
            (new_xp, new_level, user_id)
        )

        db.commit()

        # Update streak & check badges (quiz_novice, quiz_master, perfect_score)
        update_streak(user_id, db)
        check_and_unlock_badges(user_id, db)
        
        # 7. Get submission
        cursor.execute(
            "SELECT id, quiz_id, total_score, max_score, submitted_at FROM submissions WHERE id = %s",
            (submission_id,)
        )
        submission = cursor.fetchone()
        
        percentage = round((submission['total_score'] / submission['max_score']) * 100, 2) if submission['max_score'] > 0 else 0
        
        return SubmissionResponse(
            submission_id=submission['id'],
            quiz_id=submission['quiz_id'],
            total_score=submission['total_score'],
            max_score=submission['max_score'],
            percentage=percentage,
            details=feedback_list,
            submitted_at=submission['submitted_at']
        )
        
    except MySQLError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error: {str(e)}"
        )
    finally:
        cursor.close()

@router.get("/history/me", response_model=QuizHistoryResponse)
def get_quiz_history(
    user_id: str = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get quiz history user
    """
    cursor = db.cursor(dictionary=True)
    
    try:
        cursor.execute(
            """
            SELECT s.id as submission_id, s.quiz_id, q.title as quiz_title,
                   s.total_score, s.max_score, s.submitted_at
            FROM submissions s
            JOIN quizzes q ON s.quiz_id = q.id
            WHERE s.user_id = %s
            ORDER BY s.submitted_at DESC
            """,
            (user_id,)
        )
        submissions = cursor.fetchall()
        
        history_items = []
        for sub in submissions:
            percentage = round((sub['total_score'] / sub['max_score']) * 100, 2) if sub['max_score'] > 0 else 0
            
            history_items.append(QuizHistoryItem(
                submission_id=sub['submission_id'],
                quiz_id=sub['quiz_id'],
                quiz_title=sub['quiz_title'],
                score=sub['total_score'],
                max_score=sub['max_score'],
                percentage=percentage,
                submitted_at=sub['submitted_at']
            ))
        
        return QuizHistoryResponse(
            submissions=history_items,
            total=len(history_items)
        )
        
    finally:
        cursor.close()