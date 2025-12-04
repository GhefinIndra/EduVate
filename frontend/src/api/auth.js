import client from './client';

export const authAPI = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  getProfile: () => client.get('/auth/me'),
  updateProfile: (data) => client.put('/auth/profile', data),
  changePassword: (data) => client.put('/auth/password', data),
};