import google.generativeai as genai
from typing import List, Dict
import json
import random
from app.config import settings
from app.utils.vector_store import get_vectorstore

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

# Generation config untuk optimize response time
generation_config = genai.GenerationConfig(
    temperature=0.7,
    top_p=0.9,
    top_k=40,
    max_output_tokens=2048,
)

def _generate_batch(chunks: List[Dict], n_mcq: int, n_essay: int) -> List[Dict]:
    """
    Generate quiz batch dari chunks (internal helper function)

    Args:
        chunks: List of sampled chunks dengan 'text' dan 'page'
        n_mcq: Jumlah soal MCQ untuk batch ini
        n_essay: Jumlah soal essay untuk batch ini

    Returns:
        List of questions dari batch ini
    """
    # Build context dari chunks
    context = "\n\n".join([
        f"[Halaman {chunk['page']}]\n{chunk['text']}"
        for chunk in chunks
    ])

    # Build prompt
    prompt = f"""Kamu adalah pembuat soal ujian. Buat {n_mcq} soal pilihan ganda dan {n_essay} soal essay dari materi berikut.

ATURAN:
1. Soal harus relevan dengan materi
2. Soal MCQ: 4 pilihan (A, B, C, D), hanya 1 benar
3. Soal Essay: open-ended, butuh pemahaman konsep
4. Setiap soal harus ada page_reference (halaman sumber)
5. Rubric keywords untuk essay: 3-5 kata kunci penting yang harus ada di jawaban

OUTPUT FORMAT (JSON STRICT):
{{
  "questions": [
    {{
      "type": "MCQ",
      "question": "Apa yang dimaksud dengan...?",
      "options": {{
        "A": "Pilihan A text here",
        "B": "Pilihan B text here",
        "C": "Pilihan C text here",
        "D": "Pilihan D text here"
      }},
      "correct_answer": "A",
      "page_reference": 5,
      "points": 10
    }},
    {{
      "type": "ESSAY",
      "question": "Jelaskan konsep... dan berikan contoh!",
      "rubric_keywords": ["definisi", "contoh", "penerapan"],
      "page_reference": 7,
      "points": 20
    }}
  ]
}}

MATERI:
{context}

OUTPUT (JSON only, no explanation):"""

    try:
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
            request_options={'timeout': 60}
        )
        response_text = response.text.strip()

        # Clean markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        response_text = response_text.strip()

        # Parse JSON
        quiz_data = json.loads(response_text)
        questions = quiz_data.get('questions', [])

        # Validate & set default points
        for q in questions:
            if q['type'] == 'MCQ' and 'points' not in q:
                q['points'] = 10
            elif q['type'] == 'ESSAY' and 'points' not in q:
                q['points'] = 20

        return questions

    except json.JSONDecodeError as e:
        raise Exception(f"Failed to parse quiz JSON: {str(e)}\nResponse: {response_text}")
    except Exception as e:
        raise Exception(f"Batch generation error: {str(e)}")

def generate_quiz_from_document(
    doc_id: str,
    n_mcq: int = 5,
    n_essay: int = 2
) -> List[Dict]:
    """
    Generate quiz dari dokumen menggunakan BATCHING approach

    Batching Strategy:
    - Split generation jadi 3 batches (MCQ part 1, MCQ part 2, Essay)
    - Setiap batch pakai chunks yang berbeda untuk diversity
    - Reduce timeout risk dengan smaller prompts per batch

    Args:
        doc_id: Document ID (bisa juga subject_id untuk multi-doc)
        n_mcq: Jumlah soal MCQ (default 5)
        n_essay: Jumlah soal essay (default 2)

    Returns:
        List of questions dari semua batches
    """

    # 1. Get chunks dari dokumen/subject (multi-doc support)
    vectorstore = get_vectorstore()
    collection = vectorstore._collection

    # Get chunks dengan limit yang lebih besar (100 chunks for better diversity)
    results = collection.get(
        where={"subject_id": doc_id},
        limit=100
    )

    # Fallback untuk backward compatibility
    if not results['documents']:
        results = collection.get(
            where={"doc_id": doc_id},
            limit=100
        )

    if not results['documents']:
        raise Exception("No content found in document")

    # 2. Prepare all available chunks
    all_chunks = []
    for idx in range(len(results['documents'])):
        all_chunks.append({
            "text": results['documents'][idx],
            "page": results['metadatas'][idx]['page'],
            "index": idx
        })

    # 3. Split MCQ generation into 2 batches for better distribution
    mcq_batch1_size = n_mcq // 2  # First half
    mcq_batch2_size = n_mcq - mcq_batch1_size  # Second half

    all_questions = []
    used_indices = set()

    # 4. BATCH 1: Generate MCQ part 1
    if mcq_batch1_size > 0:
        # Sample 4 chunks untuk batch 1
        batch1_size = min(4, len(all_chunks))
        batch1_indices = random.sample(range(len(all_chunks)), batch1_size)
        batch1_chunks = [all_chunks[i] for i in batch1_indices]
        used_indices.update(batch1_indices)

        print(f"[BATCH 1] Generating {mcq_batch1_size} MCQ from {batch1_size} chunks...")
        batch1_questions = _generate_batch(batch1_chunks, n_mcq=mcq_batch1_size, n_essay=0)
        all_questions.extend(batch1_questions)

    # 5. BATCH 2: Generate MCQ part 2
    if mcq_batch2_size > 0:
        # Sample 4 chunks berbeda untuk batch 2
        available_indices = [i for i in range(len(all_chunks)) if i not in used_indices]
        batch2_size = min(4, len(available_indices))
        batch2_indices = random.sample(available_indices, batch2_size)
        batch2_chunks = [all_chunks[i] for i in batch2_indices]
        used_indices.update(batch2_indices)

        print(f"[BATCH 2] Generating {mcq_batch2_size} MCQ from {batch2_size} chunks...")
        batch2_questions = _generate_batch(batch2_chunks, n_mcq=mcq_batch2_size, n_essay=0)
        all_questions.extend(batch2_questions)

    # 6. BATCH 3: Generate Essay questions
    if n_essay > 0:
        # Sample 4 chunks berbeda lagi untuk essay
        available_indices = [i for i in range(len(all_chunks)) if i not in used_indices]
        batch3_size = min(4, len(available_indices))
        batch3_indices = random.sample(available_indices, batch3_size)
        batch3_chunks = [all_chunks[i] for i in batch3_indices]

        print(f"[BATCH 3] Generating {n_essay} Essay from {batch3_size} chunks...")
        batch3_questions = _generate_batch(batch3_chunks, n_mcq=0, n_essay=n_essay)
        all_questions.extend(batch3_questions)

    print(f"[SUCCESS] Total generated: {len(all_questions)} questions ({n_mcq} MCQ + {n_essay} Essay)")

    return all_questions