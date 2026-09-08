import api from './axios';

export const getHistorySummary = async () => (await api.get('/history/summary')).data;

export const getProjectsHistory = async () => (await api.get('/history/projects')).data;

export const getTasksHistory = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return (await api.get(`/history/tasks${qs}`)).data;
};

export const getActivityHistory = async () => (await api.get('/history/activity')).data;
