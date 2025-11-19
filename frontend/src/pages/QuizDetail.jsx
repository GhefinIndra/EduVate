import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { quizAPI } from '../api/quiz';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import { ArrowLeft, Loader, ClipboardList, Eye, RotateCcw, Trophy, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuizDetail() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [quizId]);

  const fetchData = async () => {
    try {
      const [quizRes, submissionsRes] = await Promise.all([
        quizAPI.getById(quizId),
        quizAPI.getSubmissions(quizId),
      ]);

      setQuiz(quizRes.data);
      setSubmissions(submissionsRes.data.submissions || []);
    } catch (error) {
      toast.error('Failed to load quiz details');
      navigate('/topics');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeQuiz = () => {
    navigate(`/quiz/${quizId}`);
  };

  const handleViewSubmission = (submissionId) => {
    navigate(`/quiz/submission/${submissionId}/review`);
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

  const hasSubmissions = submissions.length > 0;
  const bestScore = hasSubmissions
    ? Math.max(...submissions.map(s => s.percentage))
    : 0;
  const latestSubmission = hasSubmissions ? submissions[0] : null;

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/topics/${quiz?.subject_id}/quizzes`)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4 transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Quizzes</span>
          </button>
        </div>

        {/* Quiz Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{quiz?.title}</h2>
                <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={18} />
                    <span>{quiz?.total_questions} questions</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Calendar size={18} />
                    <span>Created {new Date(quiz?.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl">
                <ClipboardList className="text-primary-600" size={40} />
              </div>
            </div>

            {/* Stats */}
            {hasSubmissions && (
              <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <p className="text-sm text-green-700 font-semibold mb-2 flex items-center justify-center gap-1">
                    <Trophy size={16} />
                    Best Score
                  </p>
                  <p className="text-4xl font-bold text-green-600">{bestScore.toFixed(1)}%</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <p className="text-sm text-blue-700 font-semibold mb-2">Total Attempts</p>
                  <p className="text-4xl font-bold text-blue-600">{submissions.length}</p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-6">
              <Button
                onClick={handleTakeQuiz}
                variant="primary"
                icon={hasSubmissions ? RotateCcw : ClipboardList}
                className="w-full text-lg py-4"
              >
                {hasSubmissions ? 'Retake Quiz' : 'Take Quiz'}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Submissions History */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Attempt History
            </h3>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
              {submissions.length}
            </span>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="text-gray-300" size={40} />
              </div>
              <p className="text-gray-500 font-medium">No attempts yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Take the quiz to see your results here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission, index) => {
                const attemptNumber = submissions.length - index;
                const scoreColor =
                  submission.percentage >= 80
                    ? 'from-green-500 to-green-600'
                    : submission.percentage >= 60
                    ? 'from-blue-500 to-blue-600'
                    : submission.percentage >= 40
                    ? 'from-yellow-500 to-yellow-600'
                    : 'from-red-500 to-red-600';

                const scoreBgColor =
                  submission.percentage >= 80
                    ? 'from-green-50 to-green-100'
                    : submission.percentage >= 60
                    ? 'from-blue-50 to-blue-100'
                    : submission.percentage >= 40
                    ? 'from-yellow-50 to-yellow-100'
                    : 'from-red-50 to-red-100';

                const isBestScore = submission.percentage === bestScore;

                return (
                  <motion.div
                    key={submission.submission_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      hover
                      className={`p-5 ${
                        isBestScore ? 'border-2 border-yellow-400 bg-gradient-to-r from-yellow-50/50 to-orange-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Attempt Number */}
                          <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
                            #{attemptNumber}
                          </div>

                          {/* Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                                Attempt {attemptNumber}
                              </h4>
                              {isBestScore && (
                                <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold flex items-center gap-1">
                                  <Trophy size={14} />
                                  Best Score
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-300">
                              {new Date(submission.submitted_at).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>

                          {/* Score */}
                          <div className={`px-5 py-3 rounded-xl bg-gradient-to-r ${scoreBgColor} shadow-sm`}>
                            <p className={`font-bold text-2xl bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`}>
                              {submission.percentage.toFixed(1)}%
                            </p>
                          </div>

                          {/* Review Button */}
                          <Button
                            onClick={() => handleViewSubmission(submission.submission_id)}
                            variant="ghost"
                            icon={Eye}
                            className="flex-shrink-0"
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
