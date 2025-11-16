import client from './client';

export const documentsAPI = {
  upload: (file, subjectId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject_id', subjectId);

    return client.post('/docs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  list: (subjectId = null) => {
    if (subjectId) {
      return client.get(`/docs?subject_id=${subjectId}`);
    }
    return client.get('/docs');
  },

  getById: (docId) => client.get(`/docs/${docId}`),

  delete: (docId) => client.delete(`/docs/${docId}`),
};