import api from './axios';

export const getNotifications = async () => (await api.get('/notifications')).data;
export const markRead = async (id) => (await api.put(`/notifications/${id}/read`)).data;
export const markAllRead = async () => (await api.put('/notifications/read-all')).data;
