import api from './axios';

export const uploadFile = async (file, taskId, projectId, googleToken) => {
  const formData = new FormData();
  formData.append('file', file);
  if (taskId) formData.append('task_id', taskId);
  if (projectId) formData.append('project_id', projectId);
  if (googleToken) formData.append('google_token', googleToken);
  
  return (await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })).data;
};
