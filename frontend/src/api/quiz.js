import client from './client';

export const quizAPI = {
  // Generate quiz from a topic (multi-doc)
  generateFromSubject: (subjectId, n_mcq = 5, n_essay = 2, timer_minutes = null) =>
    client.post('/quiz/generate', {
      subject_id: subjectId,
      n_mcq,
      n_essay,
      timer_minutes,
    }),

  // Generate quiz from a single document (legacy)
  generateFromDocument: (docId, n_mcq = 5, n_essay = 2) =>
    client.post('/quiz/generate', {
      doc_id: docId,
      n_mcq,
      n_essay,
    }),

  // Get all quizzes (optionally filter by subject_id)
  list: (subjectId = null) => {
    const params = subjectId ? `?subject_id=${subjectId}` : '';
    return client.get(`/quiz${params}`);
  },

  // Get quiz by ID (for taking/retaking)
  getById: (quizId) => client.get(`/quiz/${quizId}`),

  // Get quiz submissions/attempts history
  getSubmissions: (quizId) => client.get(`/quiz/${quizId}/submissions`),

  // Get submission detail (for review)
  getSubmissionDetail: (submissionId) => client.get(`/quiz/submission/${submissionId}`),

  // Submit quiz answers
  submit: (quizId, answers) =>
    client.post(`/quiz/${quizId}/submit`, { answers }),

  // Delete quiz
  delete: (quizId) => client.delete(`/quiz/${quizId}`),
};
