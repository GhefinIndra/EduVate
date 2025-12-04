import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import { Trophy, Medal, Award, TrendingUp, Users, Gift } from 'lucide-react';
import { getGlobalLeaderboard, getMyRank, dailyCheckin } from '../api/leaderboard';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Leaderboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [period, setPeriod] = useState('all_time');
  const [totalUsers, setTotalUsers] = useState(0);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
    fetchMyRank();
  }, [period]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await getGlobalLeaderboard(100, period);
      setLeaderboard(data.entries);
      setTotalUsers(data.total_users);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRank = async () => {
    try {
      const data = await getMyRank();
      setMyRank(data);
    } catch (error) {
      console.error('Failed to fetch rank:', error);
    }
  };

  const handleDailyCheckin = async () => {
    try {
      setCheckingIn(true);
      const result = await dailyCheckin();

      if (result.already_checked_in) {
        toast(result.message, { icon: '📅' });
      } else {
        toast.success(result.message);
        fetchMyRank(); // Refresh rank after checkin
      }
    } catch (error) {
      console.error('Daily checkin failed:', error);
      toast.error('Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="text-yellow-500" size={24} />;
    if (rank === 2) return <Medal className="text-gray-400" size={24} />;
    if (rank === 3) return <Medal className="text-orange-600" size={24} />;
    return <span className="text-gray-500 font-semibold">#{rank}</span>;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
    return 'bg-white';
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Trophy className="text-yellow-500" size={36} />
                Leaderboard
              </h1>
              <p className="text-gray-600 mt-1">
                Compete with {totalUsers.toLocaleString()} learners worldwide
              </p>
            </div>

            {/* Daily Checkin Button */}
            <Button
              onClick={handleDailyCheckin}
              disabled={checkingIn}
              className="flex items-center gap-2"
            >
              <Gift size={18} />
              {checkingIn ? 'Checking in...' : 'Daily Check-in (+10 XP)'}
            </Button>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2">
            {['all_time', 'monthly', 'weekly'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p === 'all_time' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Leaderboard */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users size={24} />
                  Top 100 Learners
                </h2>

                {loading ? (
                  <div className="space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center gap-4 p-3 bg-gray-100 rounded-lg">
                        <div className="w-8 h-8 bg-gray-300 rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, index) => (
                      <motion.div
                        key={entry.user_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`flex items-center gap-4 p-3 rounded-lg transition ${
                          entry.is_current_user
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : getRankBadge(entry.rank)
                        } ${entry.rank > 3 ? 'hover:bg-gray-50' : ''}`}
                      >
                        {/* Rank */}
                        <div className="w-12 flex justify-center">
                          {getRankIcon(entry.rank)}
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {entry.name}
                            {entry.is_current_user && (
                              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-3">
                            <span>Level {entry.level}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <TrendingUp size={14} />
                              {entry.xp.toLocaleString()} XP
                            </span>
                            {entry.streak > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-orange-600">
                                  🔥 {entry.streak} days
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Badges */}
                        {entry.badges_count > 0 && (
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Award size={18} />
                            <span className="text-sm font-medium">{entry.badges_count}</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar - Your Rank */}
          <div className="space-y-6">
            {/* Your Rank Card */}
            {myRank && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Award size={20} />
                    Your Rank
                  </h3>

                  <div className="text-center mb-4">
                    <div className="text-5xl font-bold text-blue-600 mb-2">
                      #{myRank.your_rank}
                    </div>
                    <p className="text-gray-600">
                      Top {myRank.percentile.toFixed(1)}%
                    </p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">XP</span>
                      <span className="font-semibold">{myRank.your_xp.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Level</span>
                      <span className="font-semibold">{myRank.your_level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Users</span>
                      <span className="font-semibold">{myRank.total_users.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Nearby Users */}
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Nearby Ranks</h4>
                    <div className="space-y-2">
                      {myRank.nearby_users.map((nearby) => (
                        <div
                          key={nearby.user_id}
                          className={`flex items-center justify-between p-2 rounded text-sm ${
                            nearby.is_current_user
                              ? 'bg-blue-100 font-semibold'
                              : 'bg-gray-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-gray-500">#{nearby.rank}</span>
                            <span className="truncate max-w-[120px]">
                              {nearby.name}
                            </span>
                          </span>
                          <span className="text-gray-600">{nearby.xp.toLocaleString()} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Tips Card */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp size={20} />
                  Climb the Ranks
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Complete quizzes to earn XP</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Retake quizzes to improve your score</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Daily check-in for bonus +10 XP</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Maintain your streak for consistency</span>
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
