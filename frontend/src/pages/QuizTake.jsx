import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { quizAPI } from '../api/quiz';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import QuizSubmitModal from '../components/QuizSubmitModal';
import { ArrowLeft, Loader, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuizTake() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const response = await quizAPI.getById(quizId);

      // Randomize question order
      const shuffledQuestions = [...response.data.questions].sort(() => Math.random() - 0.5);

      setQuiz({
        ...response.data,
        questions: shuffledQuestions
      });

      // Initialize answers
      const initialAnswers = {};
      shuffledQuestions.forEach((q) => {
        initialAnswers[q.id] = q.type === 'MCQ' ? null : '';
      });
      setAnswers(initialAnswers);
    } catch (error) {
      toast.error('Failed to load quiz');
      navigate('/topics');
    } finally {
      setLoading(false);
    }
  };

  const handleMcqChange = (questionId, option) => {
    setAnswers({
      ...answers,
      [questionId]: option,
    });
  };

  const handleEssayChange = (questionId, text) => {
    setAnswers({
      ...answers,
      [questionId]: text,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all questions answered
    const unanswered = Object.entries(answers).filter(
      ([_, answer]) => answer === null || answer === ''
    );

    if (unanswered.length > 0) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    // Show custom modal instead of window.confirm
    setShowSubmitModal(true);
  };

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    setSubmitting(true);

    try {
      // Convert answers object to array format expected by backend
      const answersArray = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer,
      }));

      const response = await quizAPI.submit(quizId, answersArray);
      const submissionId = response.data.submission_id;
      toast.success('Quiz submitted successfully!');
      navigate(`/quiz/${quizId}/result`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to submit quiz';
      toast.error(message);
    } finally {
      setSubmitting(false);
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

  const isCompleted = quiz?.submitted_at !== null;
  const answeredCount = Object.values(answers).filter(a => a !== null && a !== '').length;
  const progress = (answeredCount / quiz?.questions.length) * 100;

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/topics/${quiz?.subject_id}/quizzes`)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4 transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Quizzes</span>
          </button>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {isCompleted ? 'View Quiz' : 'Take Quiz'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {quiz?.questions.length} questions
                </p>
              </div>
              {isCompleted && (
                <span className="px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-green-200 text-green-700 font-semibold flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  Completed
                </span>
              )}
            </div>

            {!isCompleted && (
              <div>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Progress: {answeredCount}/{quiz?.questions.length} answered</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
                <p className="text-sm text-yellow-800 font-medium">
                  You have already completed this quiz. Viewing in read-only mode.
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {quiz?.questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6">
                <div className="flex gap-4 mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        question.type === 'MCQ'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {question.type === 'MCQ' ? 'Multiple Choice' : 'Essay'}
                      </span>
                      {!isCompleted && answers[question.id] && (
                        <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Answered
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
                      {question.question}
                    </h3>
                  </div>
                </div>

                {question.type === 'MCQ' ? (
                  <div className="ml-14 space-y-3">
                    {['A', 'B', 'C', 'D'].map((option) => {
                      const optionText = question.options[option];
                      if (!optionText) return null;

                      const isSelected = answers[question.id] === option;
                      const isCorrect = question.correct_answer === option;
                      const showCorrect = isCompleted && isCorrect;
                      const showIncorrect = isCompleted && isSelected && !isCorrect;

                      return (
                        <motion.label
                          key={option}
                          whileHover={!isCompleted ? { scale: 1.01 } : undefined}
                          whileTap={!isCompleted ? { scale: 0.99 } : undefined}
                          className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            showCorrect
                              ? 'border-green-500 bg-gradient-to-r from-green-50 to-green-100 shadow-sm'
                              : showIncorrect
                              ? 'border-red-500 bg-gradient-to-r from-red-50 to-red-100 shadow-sm'
                              : isSelected
                              ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-secondary-50 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          } ${isCompleted ? 'cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option}
                            checked={isSelected}
                            onChange={() => handleMcqChange(question.id, option)}
                            disabled={isCompleted}
                            className="mt-1 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <span className="font-bold text-gray-900 dark:text-white">{option}.</span>{' '}
                            <span className="text-gray-700 dark:text-gray-300">{optionText}</span>
                            {showCorrect && (
                              <div className="mt-2 flex items-center gap-1 text-sm text-green-700 font-semibold">
                                <CheckCircle2 size={16} />
                                Correct Answer
                              </div>
                            )}
                            {showIncorrect && (
                              <div className="mt-2 flex items-center gap-1 text-sm text-red-700 font-semibold">
                                <AlertCircle size={16} />
                                Your Answer
                              </div>
                            )}
                          </div>
                        </motion.label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ml-14">
                    <textarea
                      value={answers[question.id] || ''}
                      onChange={(e) => handleEssayChange(question.id, e.target.value)}
                      placeholder="Write your detailed answer here..."
                      rows={6}
                      disabled={isCompleted}
                      className="w-full border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition dark:bg-gray-800 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Write a detailed answer based on the course material
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}

          {!isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-8"
            >
              <Card className="p-6 shadow-xl">
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  icon={!submitting ? Send : undefined}
                  className="w-full text-lg py-4"
                  disabled={answeredCount < quiz?.questions.length}
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </Button>
                {answeredCount < quiz?.questions.length && (
                  <p className="text-center text-sm text-gray-500 mt-3">
                    Please answer all questions before submitting
                  </p>
                )}
              </Card>
            </motion.div>
          )}
        </form>

        {/* Submit Confirmation Modal */}
        <QuizSubmitModal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          onConfirm={confirmSubmit}
          questionCount={quiz?.questions.length}
        />
      </div>
    </Layout>
  );
}
