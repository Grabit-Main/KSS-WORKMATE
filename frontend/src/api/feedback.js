import api from './axios';

export const submitFeedback = async (data) => {
  try {
    return (await api.post('/feedback', data)).data;
  } catch (err) {
    return (await api.post('/reviews', data)).data;
  }
};

export const getUserFeedback = async (userId) => {
  try {
    return (await api.get(`/feedback/user/${userId}`)).data;
  } catch (err) {
    return (await api.get(`/reviews/user/${userId}`)).data;
  }
};

export const getFeedback = async (type = 'received', userId = null) => {
  const params = { type };
  if (userId) params.user_id = userId;
  return (await api.get('/feedback', { params })).data;
};

export const getFeedbackTargets = async () => {
  return (await api.get('/feedback/targets')).data;
};

// Aliases for backward compatibility
export const submitReview = submitFeedback;
export const getUserReviews = getUserFeedback;
