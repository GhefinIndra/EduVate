import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { quizAPI } from '../api/quiz';
import { topicsAPI } from '../api/topics';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import { ArrowLeft, Loader, Sparkles, FileText, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuizGenerate() {
  const { topicId } = useParams();
  const navigate = useNavigate();

  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [nMcq, setNMcq] = useState(5);
  const [nEssay, setNEssay] = useState(2);
  const [enableTimer, setEnableTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(30);

  useEffect(() => {
    fetchTopic();
  }, [topicId]);

  const fetchTopic = async () => {
    try {
      const response = await topicsAPI.getById(topicId);
      setTopic(response.data);
    } catch (error) {
      toast.error('Failed to load topic');
      navigate(`/topics/${topicId}`);
    } finally {
      setLoadingData(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (nMcq < 1 || nEssay < 1) {
      toast.error('At least 1 question for each type');
      return;
    }

    if (nMcq > 10 || nEssay > 5) {
      toast.error('Maximum: 10 MCQ, 5 Essay');
      return;
    }

    setLoading(true);

    try {
      const response = await quizAPI.generateFromSubject(
        topicId,
        nMcq,
        nEssay,
        enableTimer ? timerMinutes : null
      );
      const quizId = response.data.quiz_id;

      toast.success('Quiz generated successfully!');
      navigate(`/quiz/${quizId}/detail`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to generate quiz';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
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
      <div className="p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/topics/${topicId}`)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4 transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Topic</span>
          </button>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl">
                <Sparkles className="text-primary-600" size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generate Quiz</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{topic?.name}</p>
              </div>
            </div>
            {topic?.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {topic.description}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FileText size={16} />
              <span>{topic?.document_count || 0} documents available</span>
            </div>
          </Card>
        </div>

        {/* Generation Form */}
        <Card className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Configure Quiz</h3>

          <form onSubmit={handleGenerate} className="space-y-6">
            {/* MCQ Count */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                Multiple Choice Questions
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={nMcq}
                  onChange={(e) => setNMcq(Number.parseInt(e.target.value, 10))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="w-16 text-center">
                  <span className="text-2xl font-bold text-primary-600">{nMcq}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                <AlertCircle size={12} />
                Between 1-10 questions
              </p>
            </motion.div>

            {/* Essay Count */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                Essay Questions
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={nEssay}
                  onChange={(e) => setNEssay(Number.parseInt(e.target.value, 10))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-secondary-600"
                />
                <div className="w-16 text-center">
                  <span className="text-2xl font-bold text-secondary-600">{nEssay}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                <AlertCircle size={12} />
                Between 1-5 questions
              </p>
            </motion.div>

            {/* Timer Option */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                Quiz Timer (Optional)
              </label>

              {/* Enable Timer Toggle */}
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="enable-timer"
                  checked={enableTimer}
                  onChange={(e) => setEnableTimer(e.target.checked)}
                  className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="enable-timer" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  Enable time limit for this quiz
                </label>
              </div>

              {/* Timer Input */}
              {enableTimer && (
                <div className="ml-8 space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-primary-600" />
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(Math.max(1, Math.min(180, Number.parseInt(e.target.value) || 1)))}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">minutes</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Quiz will auto-submit when time expires. Warning at 1 minute remaining.
                  </p>
                </div>
              )}
            </motion.div>

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
            >
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quiz Summary:</p>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">{nMcq + nEssay} total questions</span>
                <span>•</span>
                <span>{nMcq} MCQ</span>
                <span>•</span>
                <span>{nEssay} Essay</span>
                {enableTimer && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {timerMinutes} min timer
                    </span>
                  </>
                )}
              </div>
            </motion.div>

            {/* Info Box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="text-primary-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-semibold text-primary-900 mb-1">AI-Generated Questions</p>
                  <p className="text-sm text-primary-800">
                    Quiz will be generated from all documents in this topic.
                    This may take a few moments. Each quiz is unique!
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                icon={!loading ? Sparkles : undefined}
                className="w-full text-lg py-4"
              >
                {loading ? 'Generating Quiz...' : 'Generate Quiz'}
              </Button>
            </motion.div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
