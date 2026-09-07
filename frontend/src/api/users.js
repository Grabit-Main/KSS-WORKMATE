import api from './axios';

export const getUsers = async () => (await api.get('/users')).data;
export const createUser = async (data) => (await api.post('/users', data)).data;
export const updateUser = async (id, data) => (await api.put(`/users/${id}`, data)).data;
export const deactivateUser = async (id) => (await api.delete(`/users/${id}`)).data;
