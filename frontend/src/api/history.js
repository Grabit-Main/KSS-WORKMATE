import api from './axios';

export const getHistorySummary = async (userId = null) => {
  const params = userId ? { user_id: userId } : {};
  return (await api.get('/history/summary', { params })).data;
};

export const getProjectsHistory = async (userId = null) => {
  const params = userId ? { user_id: userId } : {};
  return (await api.get('/history/projects', { params })).data;
};

export const getTasksHistory = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.user_id) query.append('user_id', params.user_id);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return (await api.get(`/history/tasks${qs}`)).data;
};

export const getActivityHistory = async (userId = null) => {
  const params = userId ? { user_id: userId } : {};
  return (await api.get('/history/activity', { params })).data;
};
