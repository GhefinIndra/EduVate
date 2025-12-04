import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { quizAPI } from '../api/quiz';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import QuizSubmitModal from '../components/QuizSubmitModal';
import { ArrowLeft, Loader, Send, CheckCircle2, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuizTake() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Timer states
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const timerIntervalRef = useRef(null);
  const hasShownOneMinuteWarning = useRef(false);

  useEffect(() => {
    fetchQuiz();

    return () => {
      // Cleanup timer on unmount
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [quizId]);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return;

    // Show warning at 1 minute remaining (only once)
    if (timeRemaining === 60 && !hasShownOneMinuteWarning.current) {
      setShowWarning(true);
      hasShownOneMinuteWarning.current = true;
      toast('⏰ 1 minute remaining!', {
        icon: '⚠️',
        duration: 5000,
      });
    }

    // Auto-submit when time expires
    if (timeRemaining === 0) {
      toast.error('Time expired! Auto-submitting quiz...');
      handleAutoSubmit();
      return;
    }

    // Start countdown
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [timeRemaining]);

  const fetchQuiz = async () => {
    try {
      const response = await quizAPI.getById(quizId);

      // Randomize question order
      const shuffledQuestions = [...response.data.questions].sort(() => Math.random() - 0.5);

      setQuiz({
        ...response.data,
        questions: shuffledQuestions
      });

      // Initialize timer if quiz has timer_minutes
      if (response.data.timer_minutes) {
        setTimeRemaining(response.data.timer_minutes * 60); // Convert to seconds
      }

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

    // Show custom modal (handles unanswered questions inside)
    setShowSubmitModal(true);
  };

  const handleAutoSubmit = async () => {
    // Auto-submit without confirmation when timer expires
    await performSubmit();
  };

  const confirmSubmit = async () => {
    setShowSubmitModal(false);
    await performSubmit();
  };

  const performSubmit = async () => {
    setSubmitting(true);

    // Clear timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    try {
      // Convert answers object to array format expected by backend
      const answersArray = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer: answer || '', // Empty string for unanswered
      }));

      const response = await quizAPI.submit(quizId, answersArray);
      const submissionId = response.data.submission_id;
      toast.success('Quiz submitted successfully!');
      navigate(`/quiz/submission/${submissionId}`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to submit quiz';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining === null) return 'text-gray-600';
    if (timeRemaining <= 60) return 'text-red-600';
    if (timeRemaining <= 300) return 'text-yellow-600';
    return 'text-green-600';
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
  const unansweredCount = quiz?.questions.length - answeredCount;
  const progress = (answeredCount / quiz?.questions.length) * 100;

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Timer Warning Banner */}
        {showWarning && timeRemaining !== null && timeRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-4 bg-gradient-to-r from-yellow-50 to-red-50 border-2 border-yellow-500">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
                <div>
                  <p className="text-sm text-yellow-900 font-bold">
                    ⚠️ Only {formatTime(timeRemaining)} remaining!
                  </p>
                  <p className="text-xs text-yellow-800 mt-1">
                    Quiz will auto-submit when time expires. Submit now to avoid losing your answers.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

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

              <div className="flex items-center gap-4">
                {/* Timer Display */}
                {!isCompleted && timeRemaining !== null && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-white border-2 ${
                    timeRemaining <= 60 ? 'border-red-500' : timeRemaining <= 300 ? 'border-yellow-500' : 'border-green-500'
                  }`}>
                    <Clock size={20} className={getTimerColor()} />
                    <span className={`text-xl font-bold ${getTimerColor()}`}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                )}

                {isCompleted && (
                  <span className="px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-green-200 text-green-700 font-semibold flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    Completed
                  </span>
                )}
              </div>
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
                      {!isCompleted && answers[question.id] && (answers[question.id] !== null && answers[question.id] !== '') && (
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
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </Button>
                {answeredCount < quiz?.questions.length && (
                  <p className="text-center text-sm text-yellow-600 mt-3 flex items-center justify-center gap-2">
                    <AlertCircle size={14} />
                    {quiz?.questions.length - answeredCount} question(s) unanswered. You can still submit.
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
          unansweredCount={unansweredCount}
        />
      </div>
    </Layout>
  );
}
