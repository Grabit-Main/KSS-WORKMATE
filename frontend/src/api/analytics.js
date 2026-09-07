import api from './axios';

export const getTeamAnalytics = async (teamId, period = 'monthly') => (await api.get(`/analytics/team/${teamId}?period=${period}`)).data;
export const getUserAnalytics = async (userId, period = 'monthly') => (await api.get(`/analytics/user/${userId}?period=${period}`)).data;
export const getDailyAnalytics = async () => (await api.get('/analytics/daily')).data;
export const getWeeklyAnalytics = async () => (await api.get('/analytics/weekly')).data;
export const getMonthlyAnalytics = async () => (await api.get('/analytics/monthly')).data;
