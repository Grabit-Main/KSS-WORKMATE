import api from './axios';

export const getTasks = async (params = {}) => {
  return (await api.get('/tasks', { params })).data;
};
export const getTask = async (id) => (await api.get(`/tasks/${id}`)).data;
export const createTask = async (data) => (await api.post('/tasks', data)).data;
export const startTask = async (id) => (await api.post(`/tasks/${id}/start`)).data;
export const acceptTask = async (id) => (await api.put(`/tasks/${id}/accept`)).data;
export const rejectTask = async (id, reason) => (await api.put(`/tasks/${id}/reject`, { reason })).data;
export const completeTask = async (id) => (await api.put(`/tasks/${id}/complete`)).data;
export const confirmTask = async (id) => (await api.put(`/tasks/${id}/confirm`)).data;
export const declineTask = async (id, reason) => (await api.put(`/tasks/${id}/decline`, { reason })).data;
export const reassignTask = async (id, assigned_to, reason) => (await api.put(`/tasks/${id}/reassign`, { assigned_to, reason })).data;
export const deleteTask = async (id) => (await api.delete(`/tasks/${id}`)).data;
