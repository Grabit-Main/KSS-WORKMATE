import api from './axios';

export const getHolidays = async () => {
  const res = await api.get('/holidays');
  return res.data;
};

export const createHoliday = async (payload) => {
  const res = await api.post('/holidays', payload);
  return res.data;
};

export const deleteHoliday = async (id) => {
  const res = await api.delete(`/holidays/${id}`);
  return res.data;
};
