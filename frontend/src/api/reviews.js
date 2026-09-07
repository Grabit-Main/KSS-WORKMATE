import api from './axios';

export const submitReview = async (data) => (await api.post('/reviews', data)).data;
export const getUserReviews = async (userId) => (await api.get(`/reviews/user/${userId}`)).data;
