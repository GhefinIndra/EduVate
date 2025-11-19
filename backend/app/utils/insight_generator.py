import google.generativeai as genai
from app.config import settings

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

generation_config = genai.GenerationConfig(
    temperature=0.8,
    top_p=0.9,
    top_k=40,
    max_output_tokens=300,  # Longer insights
)

def generate_topic_insight(
    topic_name: str,
    understanding_percentage: float,
    total_quizzes: int,
    total_attempts: int,
    latest_score: float
) -> str:
    """
    Generate AI insight about user's understanding of a topic

    Args:
        topic_name: Name of the topic
        understanding_percentage: Average score percentage (0-100)
        total_quizzes: Number of unique quizzes taken
        total_attempts: Total number of quiz submissions (retakes)
        latest_score: Most recent quiz score

    Returns:
        Short insight string (1-2 sentences)
    """

    # Build prompt
    prompt = f"""You are Eduvate, a friendly and insightful AI learning companion for Indonesian students.

STUDENT'S PERFORMANCE DATA:
- Topic: {topic_name}
- Average Understanding: {understanding_percentage:.1f}%
- Quizzes Completed: {total_quizzes}
- Total Attempts (including retakes): {total_attempts}
- Latest Quiz Score: {latest_score:.1f}%

TASK: Generate a personalized, actionable insight (2-4 sentences, 40-60 words) in Bahasa Indonesia.

INSIGHT STRUCTURE:
1. **Assessment**: Comment on their current mastery level
2. **Context**: Analyze trend (improving/stable/declining) if total_attempts > total_quizzes
3. **Action**: Give specific, actionable advice (what to focus on, how to improve)
4. **Motivation**: End with encouragement

GUIDELINES:
- Score ≥ 85%: "Excellent mastery! 🌟" → Suggest moving to advanced topics, real-world application, or teaching others
- Score 70-84%: "Strong understanding! 💪" → Suggest practicing edge cases, reviewing weak spots
- Score 50-69%: "Good foundation 📚" → Suggest targeted review of difficult concepts, more practice quizzes
- Score < 50%: "Let's build stronger foundations 🔨" → Suggest breaking down fundamentals, step-by-step learning

TONE: Supportive, encouraging, specific (not generic), conversational Indonesian

Insight:"""

    try:
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
            request_options={'timeout': 10}
        )

        insight = response.text.strip()

        # Remove common prefixes
        prefixes = ["Insight:", "Wawasan:", "Kesimpulan:"]
        for prefix in prefixes:
            if insight.startswith(prefix):
                insight = insight[len(prefix):].strip()

        return insight

    except Exception:
        # Fallback insight if API fails
        if understanding_percentage >= 85:
            return f"Pemahaman luar biasa pada {topic_name}! 🌟 Kamu siap untuk topik lebih advanced atau bisa coba ajarkan ke teman."
        elif understanding_percentage >= 70:
            return f"Pemahaman kuat pada {topic_name}! 💪 Coba latihan soal yang lebih challenging untuk sempurnakan skill kamu."
        elif understanding_percentage >= 50:
            return f"Dasar {topic_name} sudah mulai kuat! 📚 Review konsep yang masih kurang jelas dan perbanyak latihan."
        else:
            return f"Yuk kita perkuat fondasi {topic_name}! 🔨 Mulai dari konsep dasar step by step, pasti bisa kok!"
