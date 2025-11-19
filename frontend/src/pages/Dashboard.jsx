import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { gamificationAPI } from '../api/gamification';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import Button from '../components/Button';
import { StatCardSkeleton, TopicCardSkeleton } from '../components/Skeleton';
import { FileText, ClipboardList, TrendingUp, Award, Flame, Folder, Plus, Sparkles, Target, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState(null);
  const [topicUnderstanding, setTopicUnderstanding] = useState([]);
  const [topics, setTopics] = useState([]);

  // Helper functions for understanding percentage styling
  const getUnderstandingColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressGradient = (percentage) => {
    if (percentage >= 80) return 'from-green-500 to-green-600';
    if (percentage >= 60) return 'from-blue-500 to-blue-600';
    if (percentage >= 40) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getProgressBackground = (percentage) => {
    if (percentage >= 80) return 'from-green-50 to-green-100';
    if (percentage >= 60) return 'from-blue-50 to-blue-100';
    if (percentage >= 40) return 'from-yellow-50 to-yellow-100';
    return 'from-red-50 to-red-100';
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await gamificationAPI.getDashboard();
      const data = response.data;
      
      setStats(data.stats);
      setProgress(data.progress);
      setTopicUnderstanding(data.topic_understanding.topics);
      setTopics(data.topics);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section Skeleton */}
          <div className="bg-gradient-to-br from-primary-500 to-secondary-600 rounded-3xl p-8 mb-8 h-64">
            <div className="animate-pulse">
              <div className="h-6 w-32 bg-white/20 rounded mb-2"></div>
              <div className="h-8 w-64 bg-white/20 rounded mb-2"></div>
              <div className="h-6 w-96 bg-white/20 rounded mb-6"></div>
              <div className="flex gap-3">
                <div className="h-10 w-32 bg-white/20 rounded-xl"></div>
                <div className="h-10 w-32 bg-white/20 rounded-xl"></div>
                <div className="h-10 w-32 bg-white/20 rounded-xl"></div>
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>

          {/* Content Cards Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopicCardSkeleton />
            <TopicCardSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Welcome Banner */}
        <motion.div
          className="bg-gradient-to-r from-primary-600 via-primary-700 to-secondary-600 rounded-2xl shadow-xl p-8 mb-8 text-white overflow-hidden relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={24} className="text-yellow-300" />
              <span className="text-sm font-medium opacity-90">Dashboard</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h2>
            <p className="text-lg opacity-90 mb-6">Ready to continue your learning journey?</p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                icon={Folder}
                onClick={() => navigate('/topics')}
                className="bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border-white dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                My Topics
              </Button>
              <Button
                variant="outline"
                icon={BarChart3}
                onClick={() => navigate('/analytics')}
                className="bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border-white dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Analytics
              </Button>
              <Button
                variant="ghost"
                icon={Plus}
                onClick={() => navigate('/topics')}
                className="bg-white/20 hover:bg-white/30 text-white border-none"
              >
                Create Topic
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Topics"
            value={topics?.length || 0}
            icon={Folder}
            color="blue"
          />
          <StatCard
            title="Documents"
            value={stats?.total_documents || 0}
            icon={FileText}
            color="green"
          />
          <StatCard
            title="Quizzes Taken"
            value={stats?.total_quizzes_taken || 0}
            icon={ClipboardList}
            color="purple"
          />
          <StatCard
            title="Avg Score"
            value={`${stats?.average_quiz_score?.toFixed(1) || 0}%`}
            icon={TrendingUp}
            color="orange"
          />
        </div>

        {/* XP Progress */}
        <Card className="p-6 mb-8" gradient>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg">
                <Award className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Level {progress?.level || 1}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {progress?.xp || 0} Total XP
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 px-4 py-3 rounded-xl">
              <Flame className="text-orange-500" size={28} />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {progress?.streak || 0}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">day streak</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress to Level {(progress?.level || 1) + 1}</span>
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{progress?.xp_progress_percentage || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-3 bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress?.xp_progress_percentage || 0}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
              {progress?.xp_progress_in_current_level || 0} / {progress?.xp_for_next_level - progress?.xp_for_current_level || 100} XP
            </p>
          </div>
        </Card>

        {/* Topic Understanding */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30 rounded-xl">
              <Target className="text-primary-600 dark:text-primary-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Topic Understanding</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track your progress across different topics</p>
            </div>
          </div>

          {topicUnderstanding.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder className="text-gray-400" size={40} />
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">No topics with quizzes yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Create a topic, upload documents, and take quizzes to see your understanding!
              </p>
              <Button variant="primary" icon={Plus} onClick={() => navigate('/topics')}>
                Create Your First Topic
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {topicUnderstanding.map((topic, index) => (
                <motion.div
                  key={topic.topic_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="p-5 border border-gray-200 dark:border-gray-700"
                    hover
                    onClick={() => navigate(`/topics/${topic.topic_id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          {topic.topic_name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <ClipboardList size={16} />
                            {topic.total_quizzes} quiz{topic.total_quizzes > 1 ? 'zes' : ''}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>
                            {topic.total_attempts} attempt{topic.total_attempts > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getUnderstandingColor(topic.understanding_percentage)}`}>
                          {topic.understanding_percentage.toFixed(0)}%
                        </div>
                        <p className="text-xs text-gray-500">understanding</p>
                      </div>
                    </div>

                    {/* Understanding Bar */}
                    <div className="relative mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Progress</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Latest: {topic.latest_quiz_score.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className={`h-2 rounded-full bg-gradient-to-r ${getProgressGradient(topic.understanding_percentage)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${topic.understanding_percentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                        />
                      </div>
                    </div>

                    {/* AI Insight */}
                    {topic.insight && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <div className="flex gap-3">
                          <Sparkles className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
                          <div>
                            <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">AI Insight</p>
                            <p className="text-sm text-blue-800 dark:text-blue-200">{topic.insight}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}