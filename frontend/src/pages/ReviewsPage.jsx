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
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Performance Reviews</h2>
            <p className="text-sm text-secondary mt-1">Feedback, rating evaluations, and milestone assessments</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {[1,2,3,4].map(i => <div key={i} className="card skeleton" style={{ height: '140px' }}></div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Performance Reviews</h2>
          <p className="text-sm text-secondary mt-1">Feedback, rating evaluations, and milestone assessments</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {reviews.map(r => (
          <div
            key={r.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all var(--transition-smooth)'
            }}
          >
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1" style={{ color: '#F59E0B' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={17}
                      fill={star <= r.rating ? '#F59E0B' : 'transparent'}
                      stroke="#F59E0B"
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-secondary" style={{
                  background: 'var(--subtle)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)'
                }}>
                  {r.rating} / 5.0
                </span>
              </div>
              <p className="text-sm text-primary mb-3" style={{ lineHeight: 1.5, color: 'var(--text-primary)' }}>
                "{r.feedback}"
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
              fontSize: '11px',
              color: 'var(--text-tertiary)'
            }}>
              <span>Verified Evaluation</span>
              <span>{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        ))}
        {reviews.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center' }}>
            <Star size={32} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
            <h4 className="font-bold text-base mb-1">No Reviews Yet</h4>
            <p className="text-secondary text-sm">Performance feedback records will be listed here after task evaluations.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;
