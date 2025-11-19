import client from './client';

export const chatAPI = {
  // Create new chat session for a document
  createSession: (docId) =>
    client.post('/chat/sessions', { doc_id: docId }),

  // Create new chat session for a topic (multi-doc)
  createSessionForSubject: (subjectId) =>
    client.post('/chat/sessions', { subject_id: subjectId }),

  // Get all sessions (optionally filter by doc_id)
  getSessions: (docId) => {
    const params = docId ? `?doc_id=${docId}` : '';
    return client.get(`/chat/sessions${params}`);
  },

  // Get all sessions for a subject (topic)
  getSessionsBySubject: (subjectId) => {
    const params = subjectId ? `?subject_id=${subjectId}` : '';
    return client.get(`/chat/sessions${params}`);
  },

  // Get all messages from a session (with pagination support)
  getMessages: (sessionId, limit = 50, offset = 0) =>
    client.get(`/chat/sessions/${sessionId}/messages?limit=${limit}&offset=${offset}`),

  // Send message to a session
  sendMessage: (sessionId, content) =>
    client.post(`/chat/sessions/${sessionId}/messages`, { content }),

  // Delete a session
  deleteSession: (sessionId) =>
    client.delete(`/chat/sessions/${sessionId}`),
};