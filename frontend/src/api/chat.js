import api from './axios';

// Task Chat
export const getChat = async (taskId) => (await api.get(`/tasks/${taskId}/chat`)).data;
export const sendMessage = async (taskId, data) => (await api.post(`/tasks/${taskId}/chat`, data)).data;

// Direct Chat
export const getDirectChat = async (userId) => (await api.get(`/chat/direct/${userId}`)).data;
export const sendDirectMessage = async (userId, data) => (await api.post(`/chat/direct/${userId}`, data)).data;

// Team Channel Chat
export const getChannelChat = async (channelName) => (await api.get(`/chat/channel/${channelName}`)).data;
export const sendChannelMessage = async (channelName, data) => (await api.post(`/chat/channel/${channelName}`, data)).data;

// Project Discussion Chat
export const getProjectChat = async (projectId) => (await api.get(`/chat/project/${projectId}`)).data;
export const sendProjectMessage = async (projectId, data) => (await api.post(`/chat/project/${projectId}`, data)).data;
