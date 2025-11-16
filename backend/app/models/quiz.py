from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class GenerateQuizRequest(BaseModel):
    """
    Request untuk generate quiz dari topik (multi-doc)
    """
    subject_id: str
    n_mcq: int = 5
    n_essay: int = 2

    class Config:
        json_schema_extra = {
            "example": {
                "subject_id": "bc5c542c-1fae-4251-890d-13c5c4f99c85",
                "n_mcq": 5,
                "n_essay": 2
            }
        }

class QuestionResponse(BaseModel):
    """
    Response untuk single question
    """
    id: str
    type: str  # MCQ atau ESSAY
    question: str
    options: Optional[dict] = None  # Untuk MCQ (format: {"A": "...", "B": "...", ...})
    correct_answer: Optional[str] = None  # Only included if quiz submitted
    page_reference: Optional[int] = None
    points: int
    ai_feedback: Optional[str] = None  # AI feedback for essay answers

class QuizResponse(BaseModel):
    """
    Response setelah generate quiz
    """
    quiz_id: str
    title: str
    subject_id: str
    total_questions: int
    questions: List[QuestionResponse]
    created_at: datetime
    submitted_at: Optional[datetime] = None
    user_answers: Optional[dict] = None  # {"question_id": "answer"}
    score: Optional[float] = None

class SubmitAnswerRequest(BaseModel):
    """
    Request untuk submit quiz
    """
    answers: List[dict]  # [{"question_id": "xxx", "answer": "..."}, ...]
    
    class Config:
        json_schema_extra = {
            "example": {
                "answers": [
                    {"question_id": "q1-uuid", "answer": "2"},
                    {"question_id": "q2-uuid", "answer": "Transfer learning adalah..."}
                ]
            }
        }

class QuestionFeedback(BaseModel):
    """
    Feedback per question
    """
    question_id: str
    question: str
    user_answer: str
    is_correct: Optional[bool] = None  # Untuk MCQ
    score: int
    max_points: int
    feedback: str

class SubmissionResponse(BaseModel):
    """
    Response setelah submit quiz
    """
    submission_id: str
    quiz_id: str
    total_score: int
    max_score: int
    percentage: float
    details: List[QuestionFeedback]
    submitted_at: datetime

class QuizHistoryItem(BaseModel):
    """
    Item di quiz history
    """
    submission_id: str
    quiz_id: str
    quiz_title: str
    score: int
    max_score: int
    percentage: float
    submitted_at: datetime

class QuizHistoryResponse(BaseModel):
    """
    Response quiz history
    """
    submissions: List[QuizHistoryItem]
    total: int

class QuizListItem(BaseModel):
    """
    Item di quiz list (for topic detail page)
    """
    id: str
    title: str
    subject_id: Optional[str] = None
    total_questions: int
    created_at: datetime
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None

class QuizListResponse(BaseModel):
    """
    Response quiz list
    """
    quizzes: List[QuizListItem]
    total: int