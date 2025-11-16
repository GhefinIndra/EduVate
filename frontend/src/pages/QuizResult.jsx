import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { quizAPI } from '../api/quiz';
import { ArrowLeft, Loader, Trophy, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

export default function QuizResult() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const response = await quizAPI.getById(quizId);

      if (!response.data.submitted_at) {
        toast.error('Quiz not submitted yet');
        navigate(`/quiz/${quizId}`);
        return;
      }

      setQuiz(response.data);
    } catch (error) {
      toast.error('Failed to load quiz result');
      navigate('/topics');
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    navigate(`/topics/${quiz?.subject_id}/quiz`);
  };

  const handleViewQuizzes = () => {
    navigate(`/topics/${quiz?.subject_id}/quizzes`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const score = quiz?.score || 0;
  const totalQuestions = quiz?.questions?.length || 0;
  const mcqQuestions = quiz?.questions?.filter(q => q.type === 'MCQ') || [];
  const essayQuestions = quiz?.questions?.filter(q => q.type === 'ESSAY') || [];

  // Calculate MCQ score
  const correctMcq = mcqQuestions.filter(q => {
    const userAnswer = quiz.user_answers?.[q.id];
    return userAnswer === q.correct_answer;
  }).length;

  // Score status
  let scoreColor = 'text-red-600';
  let scoreLabel = 'Needs Improvement';
  if (score >= 80) {
    scoreColor = 'text-green-600';
    scoreLabel = 'Excellent!';
  } else if (score >= 60) {
    scoreColor = 'text-blue-600';
    scoreLabel = 'Good Job!';
  } else if (score >= 40) {
    scoreColor = 'text-yellow-600';
    scoreLabel = 'Fair';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/topics/${quiz?.subject_id}/quizzes`)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Quiz Result</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Card */}
        <div className="bg-white rounded-lg shadow p-8 mb-6 text-center">
          <Trophy className={`mx-auto mb-4 ${scoreColor}`} size={64} />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {scoreLabel}
          </h2>
          <p className={`text-6xl font-bold mb-4 ${scoreColor}`}>
            {score}
          </p>
          <p className="text-gray-600">
            Completed on {new Date(quiz?.submitted_at).toLocaleString('id-ID')}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">MCQ Correct</p>
              <p className="text-2xl font-bold text-gray-900">
                {correctMcq}/{mcqQuestions.length}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleRetake}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
            >
              <RotateCcw size={20} />
              Generate New Quiz
            </button>
            <button
              onClick={handleViewQuizzes}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
            >
              View All Quizzes
            </button>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Results</h3>

          <div className="space-y-6">
            {quiz?.questions.map((question, index) => {
              const userAnswer = quiz.user_answers?.[question.id];
              const isCorrect = question.type === 'MCQ' && userAnswer === question.correct_answer;
              const isWrong = question.type === 'MCQ' && userAnswer !== question.correct_answer;

              return (
                <div key={question.id} className="border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex gap-3 mb-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                          {question.type === 'MCQ' ? 'Multiple Choice' : 'Essay'}
                        </span>
                        {question.type === 'MCQ' && (
                          isCorrect ? (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                              <CheckCircle size={12} />
                              Correct
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                              <XCircle size={12} />
                              Incorrect
                            </span>
                          )
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900">{question.question}</h4>
                    </div>
                  </div>

                  {question.type === 'MCQ' ? (
                    <div className="ml-11 space-y-2">
                      {['A', 'B', 'C', 'D'].map((option) => {
                        const optionText = question.options[option];
                        if (!optionText) return null;

                        const isUserAnswer = userAnswer === option;
                        const isCorrectAnswer = question.correct_answer === option;

                        return (
                          <div
                            key={option}
                            className={`p-3 border rounded-lg ${
                              isCorrectAnswer
                                ? 'border-green-500 bg-green-50'
                                : isUserAnswer
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <span className="font-medium text-gray-900">{option}.</span>{' '}
                            <span className="text-gray-700">{optionText}</span>
                            {isCorrectAnswer && (
                              <span className="ml-2 text-xs text-green-700 font-medium">
                                ✓ Correct Answer
                              </span>
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <span className="ml-2 text-xs text-red-700 font-medium">
                                ✗ Your Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="ml-11">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2 font-medium">Your Answer:</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{userAnswer || 'No answer provided'}</p>
                      </div>
                      {question.ai_feedback && (
                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800 font-medium mb-1">AI Feedback:</p>
                          <p className="text-sm text-blue-900">{question.ai_feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
