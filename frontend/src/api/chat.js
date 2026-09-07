import api from './axios';

export const getChat = async (taskId) => (await api.get(`/tasks/${taskId}/chat`)).data;
export const sendMessage = async (taskId, data) => (await api.post(`/tasks/${taskId}/chat`, data)).data;
