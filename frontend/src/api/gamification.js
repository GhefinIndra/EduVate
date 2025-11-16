import client from './client';

export const gamificationAPI = {
  getProgress: () => client.get('/me/progress'),
  getStats: () => client.get('/me/stats'),
  getDocumentUnderstanding: () => client.get('/me/document-understanding'),
  getTopicUnderstanding: () => client.get('/me/topic-understanding'),
};