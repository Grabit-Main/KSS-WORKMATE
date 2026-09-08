import api from './axios';

export const getTeams = async () => (await api.get('/teams')).data;
export const createTeam = async (data) => (await api.post('/teams', data)).data;
export const getTeam = async (id) => (await api.get(`/teams/${id}`)).data;
export const updateTeam = async (id, data) => (await api.put(`/teams/${id}`, data)).data;
export const addMember = async (teamId, data) => (await api.post(`/teams/${teamId}/members`, data)).data;
export const updateMember = async (teamId, userId, data) => (await api.put(`/teams/${teamId}/members/${userId}`, data)).data;
export const removeMember = async (teamId, userId) => (await api.delete(`/teams/${teamId}/members/${userId}`)).data;
export const deleteTeam = async (id) => (await api.delete(`/teams/${id}`)).data;
export const setTeamLead = async (teamId, userId) => (await api.put(`/teams/${teamId}/lead/${userId}`)).data;
