import api from './axios';

export const uploadFile = async (file, taskId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('task_id', taskId);
  
  return (await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })).data;
};
