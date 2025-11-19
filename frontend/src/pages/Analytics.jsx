import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamificationAPI } from '../api/gamification';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Skeleton, { StatCardSkeleton } from '../components/Skeleton';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Calendar, Award,
  BookOpen, MessageSquare, FileText, Target, Activity,
  ArrowLeft, Sparkles, Flame
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [xpHistory, setXpHistory] = useState(null);
  const [quizPerformance, setQuizPerformance] = useState(null);
  const [activitySummary, setActivitySummary] = useState(null);
  const [dailyActivity, setDailyActivity] = useState(null);
  const [topicUnderstanding, setTopicUnderstanding] = useState(null);
  const [selectedDays, setSelectedDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedDays]);

  const fetchAnalytics = async () => {
    try {
      const [xpRes, quizRes, activityRes, dailyRes, topicRes] = await Promise.all([
        gamificationAPI.getXPHistory(selectedDays),
        gamificationAPI.getQuizPerformance(20),
        gamificationAPI.getActivitySummary(),
        gamificationAPI.getDailyActivity(90),
        gamificationAPI.getTopicUnderstanding(),
      ]);

      setXpHistory(xpRes.data);
      setQuizPerformance(quizRes.data);
      setActivitySummary(activityRes.data);
      setDailyActivity(dailyRes.data);
      setTopicUnderstanding(topicRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton variant="button" className="w-32 mb-4" />
            <div className="flex items-center justify-between">
              <div>
                <Skeleton variant="title" className="w-64 h-10 mb-2" />
                <Skeleton variant="text" className="w-96" />
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} variant="button" className="w-16" />
                ))}
              </div>
            </div>
          </div>

          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <StatCardSkeleton key={i} />
            ))}
          </div>

          {/* Chart Skeletons */}
          <Card className="p-6 mb-8">
            <Skeleton variant="title" className="w-48 h-8 mb-6" />
            <Skeleton variant="rect" className="w-full h-64" />
          </Card>

          <Card className="p-6 mb-8">
            <Skeleton variant="title" className="w-48 h-8 mb-6" />
            <Skeleton variant="rect" className="w-full h-64" />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="p-6">
              <Skeleton variant="title" className="w-48 h-8 mb-6" />
              <Skeleton variant="rect" className="w-full h-64" />
            </Card>
            <Card className="p-6">
              <Skeleton variant="title" className="w-48 h-8 mb-6" />
              <Skeleton variant="rect" className="w-full h-64" />
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Prepare data for charts
  const xpChartData = xpHistory?.data_points?.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    XP: point.xp,
    'Total XP': point.cumulative_xp
  })) || [];

  const quizChartData = quizPerformance?.performances?.map((perf, idx) => ({
    name: `Quiz ${idx + 1}`,
    score: perf.score_percentage,
    title: perf.quiz_title,
    topic: perf.topic_name,
  })) || [];

  // Activity distribution for pie chart
  const activityData = activitySummary ? [
    { name: 'Chat Messages', value: activitySummary.summary.total_chat_messages, color: '#3b82f6' },
    { name: 'Documents', value: activitySummary.summary.total_documents_uploaded, color: '#10b981' },
    { name: 'Quizzes', value: activitySummary.summary.total_quizzes_taken, color: '#8b5cf6' },
  ].filter(item => item.value > 0) : [];

  // Trend indicator
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="text-green-500" size={24} />;
      case 'declining':
        return <TrendingDown className="text-red-500" size={24} />;
      default:
        return <Minus className="text-blue-500" size={24} />;
    }
  };

  const getTrendText = (trend) => {
    switch (trend) {
      case 'improving':
        return 'Your performance is improving! Keep it up!';
      case 'declining':
        return 'Your scores are declining. Review your study habits.';
      default:
        return 'Your performance is stable. Maintain consistency!';
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving':
        return 'from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800';
      case 'declining':
        return 'from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-red-200 dark:border-red-800';
      default:
        return 'from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800';
    }
  };

  // Prepare heatmap data
  const heatmapData = dailyActivity?.activities?.map(activity => ({
    date: activity.date,
    count: activity.activity_count,
    quizzes: activity.quizzes,
    messages: activity.messages,
    uploads: activity.uploads
  })) || [];

  // Prepare radar chart data (topic understanding)
  const radarData = topicUnderstanding?.topics?.map(topic => ({
    topic: topic.topic_name.length > 15 ? topic.topic_name.substring(0, 12) + '...' : topic.topic_name,
    understanding: Math.round(topic.understanding_percentage),
    fullName: topic.topic_name
  })) || [];

  const showRadarChart = radarData.length >= 3;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Learning Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Deep dive into your learning journey with detailed insights
              </p>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-2">
              {[7, 14, 30, 60].map(days => (
                <button
                  key={days}
                  onClick={() => setSelectedDays(days)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedDays === days
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6" gradient>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Study Days</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activitySummary?.summary.total_study_days || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6" gradient>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <MessageSquare className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Chat Messages</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activitySummary?.summary.total_chat_messages || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6" gradient>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <FileText className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Documents</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activitySummary?.summary.total_documents_uploaded || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6" gradient>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <Target className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Most Active</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {activitySummary?.summary.most_active_topic || 'N/A'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* XP Progress Over Time */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl">
              <Award className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">XP Growth</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total XP gained: {xpHistory?.total_xp_gained || 0} over {selectedDays} days
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={xpChartData}>
              <defs>
                <linearGradient id="colorXP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="XP"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorXP)"
              />
              <Area
                type="monotone"
                dataKey="Total XP"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Activity Heatmap Calendar */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl">
              <Flame className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Heatmap</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your learning activity over the last 90 days
              </p>
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="max-w-4xl mx-auto">
              <CalendarHeatmap
                startDate={new Date(new Date().setDate(new Date().getDate() - 90))}
                endDate={new Date()}
                values={heatmapData}
              classForValue={(value) => {
                if (!value || value.count === 0) {
                  return 'color-empty';
                }
                if (value.count >= 10) return 'color-scale-4';
                if (value.count >= 7) return 'color-scale-3';
                if (value.count >= 4) return 'color-scale-2';
                return 'color-scale-1';
              }}
              tooltipDataAttrs={(value) => {
                if (!value || !value.date) {
                  return { 'data-tip': 'No data' };
                }
                const date = new Date(value.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                return {
                  'data-tip': `${date}: ${value.count} activities (${value.quizzes} quizzes, ${value.messages} messages, ${value.uploads} uploads)`
                };
              }}
                showWeekdayLabels
              />
            </div>
          </div>          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"></div>
              <div className="w-4 h-4 bg-green-200 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded"></div>
              <div className="w-4 h-4 bg-green-400 dark:bg-green-700 border border-green-500 dark:border-green-600 rounded"></div>
              <div className="w-4 h-4 bg-green-600 dark:bg-green-500 border border-green-700 dark:border-green-400 rounded"></div>
              <div className="w-4 h-4 bg-green-800 dark:bg-green-300 border border-green-900 dark:border-green-200 rounded"></div>
            </div>
            <span>More</span>
          </div>

          <style jsx>{`
            .react-calendar-heatmap {
              font-size: 12px;
            }
            .react-calendar-heatmap .color-empty {
              fill: #ebedf0;
            }
            .react-calendar-heatmap .color-scale-1 {
              fill: #c6e48b;
            }
            .react-calendar-heatmap .color-scale-2 {
              fill: #7bc96f;
            }
            .react-calendar-heatmap .color-scale-3 {
              fill: #239a3b;
            }
            .react-calendar-heatmap .color-scale-4 {
              fill: #196127;
            }
            .dark .react-calendar-heatmap .color-empty {
              fill: #1f2937;
            }
            .dark .react-calendar-heatmap .color-scale-1 {
              fill: #14532d;
            }
            .dark .react-calendar-heatmap .color-scale-2 {
              fill: #15803d;
            }
            .dark .react-calendar-heatmap .color-scale-3 {
              fill: #16a34a;
            }
            .dark .react-calendar-heatmap .color-scale-4 {
              fill: #22c55e;
            }
            .react-calendar-heatmap text {
              font-size: 10px;
              fill: #6b7280;
            }
            .dark .react-calendar-heatmap text {
              fill: #9ca3af;
            }
          `}</style>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Quiz Performance Trend */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl">
                <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Performance</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Average: {quizPerformance?.average_score?.toFixed(1) || 0}% across {quizPerformance?.total_quizzes || 0} quizzes
                </p>
              </div>
            </div>

            {/* Trend Insight */}
            {quizPerformance?.trend && (
              <div className={`bg-gradient-to-r ${getTrendColor(quizPerformance.trend)} border rounded-xl p-4 mb-6`}>
                <div className="flex items-center gap-3">
                  {getTrendIcon(quizPerformance.trend)}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {quizPerformance.trend.charAt(0).toUpperCase() + quizPerformance.trend.slice(1)}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {getTrendText(quizPerformance.trend)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={quizChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-gray-900 dark:text-white">{payload[0].payload.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{payload[0].payload.topic}</p>
                          <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">
                            {payload[0].value.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="score"
                  fill="#3b82f6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Activity Distribution */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
                <Activity className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Distribution</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  How you spend your study time
                </p>
              </div>
            </div>

            {activityData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={activityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  {activityData.map((item) => (
                    <div key={item.name} className="text-center">
                      <div
                        className="w-4 h-4 rounded-full mx-auto mb-2"
                        style={{ backgroundColor: item.color }}
                      />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{item.name}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Activity className="text-gray-400 mx-auto mb-4" size={48} />
                <p className="text-gray-600 dark:text-gray-400">No activity data yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Start learning to see your activity distribution!</p>
              </div>
            )}
          </Card>

          {/* Skill Radar Chart */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-xl">
                <Target className="text-cyan-600 dark:text-cyan-400" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Topic Mastery</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Understanding level across topics
                </p>
              </div>
            </div>

            {showRadarChart ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="topic"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                  />
                  <Radar
                    name="Understanding %"
                    dataKey="understanding"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = radarData.find(d => d.topic === payload[0].payload.topic);
                        return (
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                            <p className="font-semibold text-gray-900 dark:text-white">{data?.fullName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Understanding: {payload[0].value}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="text-gray-300 dark:text-gray-600" size={40} />
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Not Enough Data</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Complete quizzes in at least 3 different topics to unlock the radar chart
                </p>
                {radarData.length > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
                    Current topics: {radarData.length}/3
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Activities */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-xl">
              <Sparkles className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Activities</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your latest learning actions
              </p>
            </div>
          </div>

          {activitySummary?.recent_activities?.length > 0 ? (
            <div className="space-y-3">
              {activitySummary.recent_activities.slice(0, 5).map((activity, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'quiz'
                      ? 'bg-purple-100 dark:bg-purple-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    {activity.type === 'quiz' ? (
                      <BookOpen className="text-purple-600 dark:text-purple-400" size={20} />
                    ) : (
                      <FileText className="text-green-600 dark:text-green-400" size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {activity.description}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {activity.topic} • {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="text-gray-400 mx-auto mb-4" size={48} />
              <p className="text-gray-600 dark:text-gray-400">No recent activities</p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
