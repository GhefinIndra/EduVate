import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { quizAPI } from '../api/quiz';
import { topicsAPI } from '../api/topics';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import { ArrowLeft, Loader, ClipboardList, Trash2, CheckCircle2, Clock, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuizList() {
  const { topicId } = useParams();
  const navigate = useNavigate();

  const [topic, setTopic] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [topicId]);

  const fetchData = async () => {
    try {
      const [topicRes, quizzesRes] = await Promise.all([
        topicsAPI.getById(topicId),
        quizAPI.list(topicId),
      ]);

      setTopic(topicRes.data);
      setQuizzes(quizzesRes.data.quizzes || []);
    } catch (error) {
      toast.error('Failed to load quizzes');
      navigate(`/topics/${topicId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId, e) => {
    e.stopPropagation();

    if (!window.confirm('Delete this quiz?')) return;

    try {
      await quizAPI.delete(quizId);
      toast.success('Quiz deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete quiz');
    }
  };

  const handleViewQuiz = (quizId) => {
    navigate(`/quiz/${quizId}/detail`);
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

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/topics/${topicId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-4 transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Topic</span>
          </button>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl">
                <ClipboardList className="text-primary-600" size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{topic?.name}</h1>
                <p className="text-gray-600 mt-1">Quiz History</p>
              </div>
            </div>
            {topic?.description && (
              <p className="text-gray-600 text-sm mt-4 p-4 bg-gray-50 rounded-lg">
                {topic.description}
              </p>
            )}
          </Card>
        </div>

        {/* Quizzes List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              Your Quizzes
            </h3>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {quizzes.length}
            </span>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="text-gray-300" size={40} />
              </div>
              <p className="text-gray-500 font-medium">No quizzes yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Generate a quiz from the topic page to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz, index) => {
                const totalQuestions = quiz.questions?.length || 0;
                const isCompleted = quiz.submitted_at !== null;
                const score = quiz.score;

                return (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      hover
                      className="p-5"
                      onClick={() => handleViewQuiz(quiz.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="p-2 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg">
                              <ClipboardList className="text-primary-600" size={24} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-lg">
                                Quiz - {new Date(quiz.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </h4>
                              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <ClipboardList size={14} />
                                {totalQuestions} questions
                              </p>
                            </div>
                          </div>

                          {/* Status & Score */}
                          <div className="flex items-center gap-3 ml-14">
                            {isCompleted ? (
                              <>
                                <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                                  <CheckCircle2 size={12} />
                                  Completed
                                </span>
                                {score !== null && (
                                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                                    <Trophy size={14} className={score >= 80 ? 'text-yellow-500' : 'text-gray-400'} />
                                    Score: {score}/100
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium flex items-center gap-1">
                                <Clock size={12} />
                                Not Started
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                          title="Delete Quiz"
                        >
                          <Trash2 size={18} />
                        </button>
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
