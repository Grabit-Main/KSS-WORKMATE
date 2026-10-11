import api from './axios';

// Daily Pulse
export const getDailyPulses = async (userId, date) => {
  const params = {};
  if (userId) params.user_id = userId;
  if (date) params.date = date;
  const res = await api.get('/mywork/pulse', { params });
  return res.data;
};

export const submitDailyPulse = async (payload) => {
  const res = await api.post('/mywork/pulse', payload);
  return res.data;
};

// Blockers
export const getBlockers = async (userId) => {
  const params = {};
  if (userId) params.user_id = userId;
  const res = await api.get('/mywork/blockers', { params });
  return res.data;
};

export const reportBlocker = async (payload) => {
  const res = await api.post('/mywork/blockers', payload);
  return res.data;
};

export const resolveBlocker = async (blockerId) => {
  const res = await api.put(`/mywork/blockers/${blockerId}/resolve`);
  return res.data;
};

// Help Requests
export const getHelpRequests = async (userId) => {
  const params = {};
  if (userId) params.user_id = userId;
  const res = await api.get('/mywork/help', { params });
  return res.data;
};

export const requestHelp = async (payload) => {
  const res = await api.post('/mywork/help', payload);
  return res.data;
};

// Focus Sessions
export const getFocusSessions = async (userId) => {
  const params = {};
  if (userId) params.user_id = userId;
  const res = await api.get('/mywork/focus', { params });
  return res.data;
};

export const saveFocusSession = async (payload) => {
  const res = await api.post('/mywork/focus', payload);
  return res.data;
};
