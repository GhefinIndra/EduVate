import google.generativeai as genai
from typing import Dict, List
import json
from app.config import settings

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

def grade_mcq(user_answer: str, correct_answer: str, points: int) -> Dict:
    """
    Grade MCQ (simple exact match)
    
    Args:
        user_answer: Index jawaban user (0-3 atau "A"-"D")
        correct_answer: Index jawaban benar (0-3 atau "A"-"D")
        points: Poin maksimal soal
    
    Returns:
        {
            "is_correct": True/False,
            "score": points atau 0,
            "feedback": "..."
        }
    """
    # Normalize answers (convert A-D to 0-3)
    answer_map = {"A": "0", "B": "1", "C": "2", "D": "3"}
    
    user_ans_normalized = answer_map.get(user_answer.upper(), user_answer)
    correct_ans_normalized = answer_map.get(correct_answer.upper(), correct_answer)
    
    is_correct = user_ans_normalized == correct_ans_normalized
    
    return {
        "is_correct": is_correct,
        "score": points if is_correct else 0,
        "feedback": "Jawaban benar! ✓" if is_correct else f"Jawaban salah. Jawaban yang benar: {correct_answer}"
    }

def grade_essay(
    question: str,
    user_answer: str,
    rubric_keywords: List[str],
    max_points: int
) -> Dict:
    """
    Grade Essay menggunakan Gemini dengan rubric keywords
    
    Args:
        question: Pertanyaan soal
        user_answer: Jawaban user
        rubric_keywords: Keywords yang harus ada di jawaban
        max_points: Poin maksimal
    
    Returns:
        {
            "score": 0-max_points,
            "feedback": "..."
        }
    """
    
    prompt = f"""Kamu adalah penilai jawaban essay. Nilai jawaban berikut berdasarkan rubric keywords.

PERTANYAAN:
{question}

RUBRIC KEYWORDS (konsep penting yang harus ada):
{', '.join(rubric_keywords)}

JAWABAN SISWA:
{user_answer}

INSTRUKSI PENILAIAN:
1. Cek apakah jawaban mengandung konsep dari rubric keywords
2. Nilai kelengkapan, kejelasan, dan keakuratan jawaban
3. Beri score 0-{max_points}
4. Beri feedback konstruktif (2-3 kalimat) yang menjelaskan:
   - Apa yang sudah bagus
   - Apa yang kurang/perlu diperbaiki
   - Konsep mana yang terlewat (jika ada)

OUTPUT FORMAT (JSON STRICT):
{{
  "score": 18,
  "feedback": "Jawaban sudah menjelaskan definisi dengan baik. Namun, kurang detail dalam memberikan contoh penerapan. Coba tambahkan contoh konkret untuk memperkuat pemahaman."
}}

OUTPUT (JSON only):"""

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean markdown
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        # Parse JSON
        grading_result = json.loads(response_text)
        
        # Validate score range
        score = grading_result.get('score', 0)
        if score < 0:
            score = 0
        if score > max_points:
            score = max_points
        
        return {
            "score": score,
            "feedback": grading_result.get('feedback', 'Tidak ada feedback.')
        }
        
    except json.JSONDecodeError:
        # Fallback: keyword matching
        score = 0
        keywords_found = []
        
        user_answer_lower = user_answer.lower()
        for keyword in rubric_keywords:
            if keyword.lower() in user_answer_lower:
                keywords_found.append(keyword)
        
        # Score proportional to keywords found
        score = int((len(keywords_found) / len(rubric_keywords)) * max_points)
        
        return {
            "score": score,
            "feedback": f"Jawaban mencakup {len(keywords_found)}/{len(rubric_keywords)} konsep penting. Keywords ditemukan: {', '.join(keywords_found) if keywords_found else 'tidak ada'}."
        }
        
    except Exception as e:
        # Fallback score
        return {
            "score": 0,
            "feedback": f"Error saat grading: {str(e)}"
        }

def grade_submission(questions: List[Dict], answers: List[Dict]) -> Dict:
    """
    Grade full submission (semua soal)
    
    Args:
        questions: List of questions dari quiz
        answers: List of user answers
            Format: [{"question_id": "xxx", "answer": "..."}, ...]
    
    Returns:
        {
            "total_score": 85,
            "max_score": 100,
            "details": [
                {
                    "question_id": "xxx",
                    "type": "MCQ",
                    "is_correct": True,
                    "score": 10,
                    "feedback": "..."
                },
                ...
            ]
        }
    """
    
    # Map answers by question_id
    answer_map = {ans['question_id']: ans['answer'] for ans in answers}
    
    total_score = 0
    max_score = 0
    details = []
    
    for question in questions:
        q_id = question['id']
        q_type = question['type']
        points = question['points']
        max_score += points
        
        user_answer = answer_map.get(q_id, "")
        
        if q_type == 'MCQ':
            result = grade_mcq(
                user_answer=user_answer,
                correct_answer=question['correct_answer'],
                points=points
            )
            details.append({
                "question_id": q_id,
                "type": "MCQ",
                "is_correct": result['is_correct'],
                "score": result['score'],
                "feedback": result['feedback']
            })
            total_score += result['score']
            
        elif q_type == 'ESSAY':
            result = grade_essay(
                question=question['question'],
                user_answer=user_answer,
                rubric_keywords=question['rubric_keywords'],
                max_points=points
            )
            details.append({
                "question_id": q_id,
                "type": "ESSAY",
                "is_correct": None,  # Essay tidak ada benar/salah
                "score": result['score'],
                "feedback": result['feedback']
            })
            total_score += result['score']
    
    return {
        "total_score": total_score,
        "max_score": max_score,
        "details": details
    }