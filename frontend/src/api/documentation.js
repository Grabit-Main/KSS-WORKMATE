import api from './axios';

export const getDocumentations = async (params = {}) => (await api.get('/documentation', { params })).data;
export const getDocumentationSummary = async () => (await api.get('/documentation/summary')).data;
export const getDocumentation = async (id) => (await api.get(`/documentation/${id}`)).data;
export const createDocumentation = async (data) => (await api.post('/documentation', data)).data;
export const updateDocumentation = async (id, data) => (await api.put(`/documentation/${id}`, data)).data;
export const deleteDocumentation = async (id) => (await api.delete(`/documentation/${id}`)).data;
