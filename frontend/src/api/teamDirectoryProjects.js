import api from './axios';

export const getTeamDirectoryProjects = async (params = {}) => {
  return (await api.get('/team-directory-projects', { params })).data;
};

export const createTeamDirectoryProject = async (data) => {
  return (await api.post('/team-directory-projects', data)).data;
};

export const updateTeamDirectoryProject = async (id, data) => {
  return (await api.put(`/team-directory-projects/${id}`, data)).data;
};

export const deleteTeamDirectoryProject = async (id) => {
  return (await api.delete(`/team-directory-projects/${id}`)).data;
};
