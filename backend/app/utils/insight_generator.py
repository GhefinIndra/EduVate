import google.generativeai as genai
from app.config import settings

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

generation_config = genai.GenerationConfig(
    temperature=0.7,
    top_p=0.9,
    top_k=40,
    max_output_tokens=150,  # Short insights
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
    prompt = f"""You are an educational AI assistant analyzing a student's learning progress.

Topic: {topic_name}
Average Understanding: {understanding_percentage:.1f}%
Quizzes Taken: {total_quizzes}
Total Attempts: {total_attempts}
Latest Score: {latest_score:.1f}%

Generate a SHORT, ENCOURAGING insight (1-2 sentences max, ~20-30 words) about the student's understanding of this topic.

Guidelines:
- If score >= 80%: Praise mastery, suggest advanced topics
- If score 60-79%: Acknowledge good progress, suggest more practice
- If score 40-59%: Encourage improvement, suggest focused review
- If score < 40%: Be supportive, suggest fundamental review
- Mention trends (improving/declining) if total_attempts > 1
- Keep it motivational and actionable
- Use Indonesian language (bahasa Indonesia)

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

    except Exception as e:
        # Fallback insight if API fails
        if understanding_percentage >= 80:
            return f"Pemahaman sangat baik pada {topic_name}! Terus pertahankan."
        elif understanding_percentage >= 60:
            return f"Pemahaman baik pada {topic_name}. Latihan lebih akan meningkatkan skor."
        elif understanding_percentage >= 40:
            return f"Perlu lebih banyak latihan pada {topic_name}. Jangan menyerah!"
        else:
            return f"Mari fokus mempelajari dasar-dasar {topic_name} lebih dalam."
