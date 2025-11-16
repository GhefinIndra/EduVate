import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { quizAPI } from '../api/quiz';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import { ArrowLeft, Loader, CheckCircle, XCircle, Trophy, Sparkles, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';

export default function SubmissionReview() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      const response = await quizAPI.getSubmissionDetail(submissionId);
      setQuiz(response.data);

      // Show confetti for high scores
      if (response.data.score >= 80) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    } catch (error) {
      toast.error('Failed to load submission');
      navigate('/topics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader className="animate-spin text-primary-600" size={32} />
        </div>
      </Layout>
    );
  }

  const score = quiz?.score || 0;
  const scoreColor =
    score >= 80
      ? 'from-green-500 to-green-600'
      : score >= 60
      ? 'from-blue-500 to-blue-600'
      : score >= 40
      ? 'from-yellow-500 to-yellow-600'
      : 'from-red-500 to-red-600';

  const scoreBgColor =
    score >= 80
      ? 'from-green-50 to-green-100'
      : score >= 60
      ? 'from-blue-50 to-blue-100'
      : score >= 40
      ? 'from-yellow-50 to-yellow-100'
      : 'from-red-50 to-red-100';

  const scoreLabel =
    score >= 80
      ? 'Excellent!'
      : score >= 60
      ? 'Good Job!'
      : score >= 40
      ? 'Fair'
      : 'Needs Improvement';

  const mcqQuestions = quiz?.questions?.filter(q => q.type === 'MCQ') || [];
  const essayQuestions = quiz?.questions?.filter(q => q.type === 'ESSAY') || [];

  const correctMcq = mcqQuestions.filter(q => {
    const userAnswer = quiz.user_answers?.[q.id];
    return userAnswer === q.correct_answer;
  }).length;

  return (
    <Layout>
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}

      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/quiz/${quiz?.quiz_id}/detail`)}
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-4 transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Quiz</span>
          </button>
        </div>

        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className={`p-8 mb-8 text-center bg-gradient-to-br ${scoreBgColor}`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <Trophy className={`mx-auto mb-4 bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`} size={80} />
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{scoreLabel}</h2>
            <motion.p
              className={`text-7xl font-bold mb-4 bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {score.toFixed(1)}
            </motion.p>
            <p className="text-gray-600 font-medium">
              Submitted on {new Date(quiz?.submitted_at).toLocaleString('id-ID')}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/70 backdrop-blur rounded-xl p-4 shadow-sm"
              >
                <p className="text-sm text-gray-600 font-medium">Total Questions</p>
                <p className="text-3xl font-bold text-gray-900">{quiz?.total_questions}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/70 backdrop-blur rounded-xl p-4 shadow-sm"
              >
                <p className="text-sm text-gray-600 font-medium">MCQ Correct</p>
                <p className="text-3xl font-bold text-gray-900">
                  {correctMcq}/{mcqQuestions.length}
                </p>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        {/* Detailed Review */}
        <Card className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Sparkles className="text-primary-600" size={24} />
            Detailed Review
          </h3>

          <div className="space-y-6">
            {quiz?.questions.map((question, index) => {
              const userAnswer = quiz.user_answers?.[question.id];
              const isCorrect = question.type === 'MCQ' && userAnswer === question.correct_answer;
              const isWrong = question.type === 'MCQ' && userAnswer !== question.correct_answer;

              return (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-200 pb-6 last:border-0"
                >
                  <div className="flex gap-4 mb-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          question.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {question.type === 'MCQ' ? 'Multiple Choice' : 'Essay'}
                        </span>
                        {question.type === 'MCQ' && (
                          isCorrect ? (
                            <span className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                              <CheckCircle size={14} />
                              Correct
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                              <XCircle size={14} />
                              Incorrect
                            </span>
                          )
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 text-lg">{question.question}</h4>
                    </div>
                  </div>

                  {question.type === 'MCQ' ? (
                    <div className="ml-14 space-y-3">
                      {['A', 'B', 'C', 'D'].map((option) => {
                        const optionText = question.options?.[option];
                        if (!optionText) return null;

                        const isUserAnswer = userAnswer === option;
                        const isCorrectAnswer = question.correct_answer === option;

                        return (
                          <div
                            key={option}
                            className={`p-4 border-2 rounded-xl ${
                              isCorrectAnswer
                                ? 'border-green-500 bg-gradient-to-r from-green-50 to-green-100'
                                : isUserAnswer
                                ? 'border-red-500 bg-gradient-to-r from-red-50 to-red-100'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <span className="font-bold text-gray-900">{option}.</span>{' '}
                            <span className="text-gray-700">{optionText}</span>
                            {isCorrectAnswer && (
                              <div className="mt-2 flex items-center gap-1 text-sm text-green-700 font-semibold">
                                <CheckCircle size={16} />
                                Correct Answer
                              </div>
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <div className="mt-2 flex items-center gap-1 text-sm text-red-700 font-semibold">
                                <XCircle size={16} />
                                Your Answer
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="ml-14">
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                        <p className="text-sm text-gray-600 mb-2 font-semibold">Your Answer:</p>
                        <p className="text-gray-900 whitespace-pre-wrap">
                          {userAnswer || 'No answer provided'}
                        </p>
                      </div>
                      {question.ai_feedback && (
                        <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                          <p className="text-sm text-blue-800 font-semibold mb-2 flex items-center gap-2">
                            <Sparkles size={16} />
                            AI Feedback:
                          </p>
                          <p className="text-sm text-blue-900">{question.ai_feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex gap-3"
        >
          <Button
            onClick={() => navigate(`/quiz/${quiz?.quiz_id}/detail`)}
            variant="ghost"
            className="flex-1"
          >
            Back to Quiz
          </Button>
          <Button
            onClick={() => navigate(`/quiz/${quiz?.quiz_id}`)}
            variant="primary"
            icon={RotateCcw}
            className="flex-1"
          >
            Retake Quiz
          </Button>
        </motion.div>
      </div>
    </Layout>
  );
}
