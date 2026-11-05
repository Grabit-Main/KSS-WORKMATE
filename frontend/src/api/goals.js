import api from './axios';

export const getGoals = async (params = {}) => {
  const res = await api.get('/goals', { params });
  return res.data;
};

export const getGoalById = async (id) => {
  const res = await api.get(`/goals/${id}`);
  return res.data;
};

export const createGoal = async (payload) => {
  const res = await api.post('/goals', payload);
  return res.data;
};

export const updateGoal = async (id, payload) => {
  const res = await api.put(`/goals/${id}`, payload);
  return res.data;
};

export const deleteGoal = async (id) => {
  const res = await api.delete(`/goals/${id}`);
  return res.data;
};

