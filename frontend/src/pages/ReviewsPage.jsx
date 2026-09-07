import React, { useEffect, useState, useCallback } from 'react';
import { getUserReviews } from '../api/reviews';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import { Star } from 'lucide-react';

const ReviewsPage = () => {
  const [reviews, setReviews] = useState(() => {
    const cached = localStorage.getItem('cache_reviews');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('cache_reviews'));
  const { user } = useAuth();

  const loadReviews = async () => {
    try {
      const data = await getUserReviews(user.id);
      setReviews(data);
      localStorage.setItem('cache_reviews', JSON.stringify(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadReviews();
  }, [user]);

  const handleUpdate = useCallback(() => {
    loadReviews();
  }, []);

  useRealtime('review.submitted', handleUpdate);

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">My Reviews</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {[1,2,3,4].map(i => <div key={i} className="card skeleton" style={{ height: '120px' }}></div>)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">My Reviews</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {reviews.map(r => (
          <div key={r.id} className="card">
            <div className="flex items-center gap-1 mb-2" style={{ color: 'var(--status-in-progress)' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} size={16} fill={star <= r.rating ? 'currentColor' : 'none'} />
              ))}
            </div>
            <p className="text-sm text-secondary mb-2">{r.feedback}</p>
            <div className="text-xs text-tertiary">
              {new Date(r.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-secondary">No reviews yet.</p>}
      </div>
    </div>
  );
};

export default ReviewsPage;
