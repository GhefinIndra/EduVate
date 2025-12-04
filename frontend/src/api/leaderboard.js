import apiClient from './client';

/**
 * Get global leaderboard
 * @param {number} limit - Number of top users (10-100)
 * @param {string} period - "all_time", "monthly", "weekly"
 */
export const getGlobalLeaderboard = async (limit = 100, period = 'all_time') => {
  const response = await apiClient.get('/leaderboard/global', {
    params: { limit, period }
  });
  return response.data;
};

/**
 * Get current user's rank and nearby users
 */
export const getMyRank = async () => {
  const response = await apiClient.get('/leaderboard/me');
  return response.data;
};

/**
 * Daily check-in (award +10 XP)
 */
export const dailyCheckin = async () => {
  const response = await apiClient.post('/me/daily-checkin');
  return response.data;
};
