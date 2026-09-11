import api from './axios';

export const getProjects = async () => (await api.get('/projects')).data;
export const getProject = async (id) => (await api.get(`/projects/${id}`)).data;
export const createProject = async (data) => (await api.post('/projects', data)).data;
export const updateProject = async (id, data) => (await api.put(`/projects/${id}`, data)).data;
export const deleteProject = async (id) => (await api.delete(`/projects/${id}`)).data;
