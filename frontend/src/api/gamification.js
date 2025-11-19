import client from './client';

export const gamificationAPI = {
  getDashboard: () => client.get('/me/dashboard'),
  getProgress: () => client.get('/me/progress'),
  getStats: () => client.get('/me/stats'),
  getDocumentUnderstanding: () => client.get('/me/document-understanding'),
  getTopicUnderstanding: () => client.get('/me/topic-understanding'),

  // Analytics endpoints
  getXPHistory: (days = 30) => client.get('/me/analytics/xp-history', { params: { days } }),
  getQuizPerformance: (limit = 20) => client.get('/me/analytics/quiz-performance', { params: { limit } }),
  getActivitySummary: () => client.get('/me/analytics/activity-summary'),
  getDailyActivity: (days = 90) => client.get('/me/analytics/daily-activity', { params: { days } }),
};