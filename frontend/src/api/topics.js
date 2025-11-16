import client from './client';

export const topicsAPI = {
  // Create new topic
  create: (data) => client.post('/topics', data),

  // Get all topics
  list: () => client.get('/topics'),

  // Get topic by ID
  getById: (topicId) => client.get(`/topics/${topicId}`),

  // Update topic
  update: (topicId, data) => client.put(`/topics/${topicId}`, data),

  // Delete topic
  delete: (topicId) => client.delete(`/topics/${topicId}`),
};
