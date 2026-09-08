import React, { useEffect, useState, useCallback } from 'react';
import { getFeedback, getFeedbackTargets, submitFeedback } from '../api/feedback';
import { getProjects } from '../api/projects';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import { Star, MessageSquareQuote, Plus, X, UserCheck, Shield, Send } from 'lucide-react';

const FeedbackPage = () => {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'given'
  const [feedbackList, setFeedbackList] = useState([]);
  const [targets, setTargets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Give Feedback Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const canGiveFeedback = ['CEO', 'CTO', 'PM', 'TL'].includes(user?.role);

  const loadData = async () => {
    try {
      const [data, targetUsers, projectList] = await Promise.all([
        getFeedback(activeTab).catch(() => []),
        canGiveFeedback ? getFeedbackTargets().catch(() => []) : Promise.resolve([]),
        getProjects().catch(() => [])
      ]);
      setFeedbackList(data);
      setTargets(targetUsers);
      setProjects(projectList);
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadData();
    }
  }, [user, activeTab]);

  const handleUpdate = useCallback(() => {
    loadData();
  }, [activeTab]);

  useRealtime('review.submitted', handleUpdate);
  useRealtime('feedback.submitted', handleUpdate);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTargetId) {
      setFormError('Please select a recipient.');
      return;
    }
    if (!comment.trim()) {
      setFormError('Please provide evaluation comments.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await submitFeedback({
        reviewee_id: selectedTargetId,
        project_id: selectedProjectId || null,
        rating,
        comment: comment.trim()
      });
      setSuccessMsg('Feedback submitted successfully!');
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg('');
        setSelectedTargetId('');
        setSelectedProjectId('');
        setComment('');
        setRating(5);
        setActiveTab('given');
        loadData();
      }, 1000);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const getUserFullName = (u) => {
    if (!u) return 'User';
    return u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
  };

  const getRoleDesc = (role) => {
    if (role === 'PM') return 'Project Manager';
    if (role === 'TL') return 'Team Lead';
    if (role === 'TM') return 'Team Member';
    if (role === 'CEO') return 'Chief Executive Officer';
    if (role === 'CTO') return 'Chief Technology Officer';
    return role;
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Performance Feedback</h2>
          <p className="text-sm text-secondary mt-1">
            {user?.role === 'PM' 
              ? 'Receive feedback from CEO/CTO and deliver appraisal feedback to Team Leads'
              : 'Evaluations, milestone assessments, and verified performance appraisals'}
          </p>
        </div>

        {canGiveFeedback && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormError('');
              setSuccessMsg('');
              setShowModal(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            <span>Give Feedback</span>
          </button>
        )}
      </div>

      {/* Tabs Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '12px'
      }}>
        <button
          onClick={() => setActiveTab('received')}
          style={{
            background: activeTab === 'received' ? 'var(--brand-50)' : 'transparent',
            color: activeTab === 'received' ? 'var(--brand-700)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'received' ? 700 : 500,
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: activeTab === 'received' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all var(--transition-fast)'
          }}
        >
          Received Feedback {user?.role === 'PM' && '(from CEO / CTO)'}
        </button>

        {canGiveFeedback && (
          <button
            onClick={() => setActiveTab('given')}
            style={{
              background: activeTab === 'given' ? 'var(--brand-50)' : 'transparent',
              color: activeTab === 'given' ? 'var(--brand-700)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'given' ? 700 : 500,
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: activeTab === 'given' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all var(--transition-fast)'
            }}
          >
            Given Feedback {user?.role === 'PM' && '(to Team Leads)'}
          </button>
        )}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {[1,2,3,4].map(i => <div key={i} className="card skeleton" style={{ height: '160px' }}></div>)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {feedbackList.map(r => {
            const displayUser = activeTab === 'received' ? r.reviewer : r.reviewee;
            const roleLabel = activeTab === 'received' ? 'Reviewer' : 'Reviewee';

            return (
              <div
                key={r.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all var(--transition-smooth)',
                  padding: '20px'
                }}
              >
                <div>
                  {/* Rating Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1" style={{ color: '#F59E0B' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={16}
                          fill={star <= r.rating ? '#F59E0B' : 'transparent'}
                          stroke="#F59E0B"
                        />
                      ))}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: 'var(--brand-50)',
                      color: 'var(--brand-700)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid rgba(99, 102, 241, 0.15)'
                    }}>
                      {r.rating}.0 / 5.0
                    </span>
                  </div>

                  {/* Feedback Text */}
                  <p className="text-sm mb-4" style={{ lineHeight: 1.6, color: 'var(--text-primary)', fontStyle: 'italic' }}>
                    "{r.comment || r.feedback}"
                  </p>
                </div>

                {/* Footer User Info */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  fontSize: '11px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {displayUser?.avatar_url ? (
                      <img
                        src={displayUser.avatar_url}
                        alt=""
                        style={{ width: '24px', height: '24px', borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--brand-gradient)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700
                      }}>
                        {displayUser?.first_name?.[0]}{displayUser?.last_name?.[0]}
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', marginRight: '4px' }}>{roleLabel}:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{getUserFullName(displayUser)}</strong>
                      <span style={{
                        marginLeft: '6px',
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--subtle)',
                        color: 'var(--text-secondary)'
                      }}>
                        {displayUser?.role}
                      </span>
                    </div>
                  </div>

                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            );
          })}

          {feedbackList.length === 0 && (
            <div className="card" style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center' }}>
              <MessageSquareQuote size={36} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
              <h4 className="font-bold text-base mb-1">
                {activeTab === 'received' ? 'No Feedback Received Yet' : 'No Feedback Given Yet'}
              </h4>
              <p className="text-secondary text-sm">
                {activeTab === 'received'
                  ? (user?.role === 'PM' ? 'Evaluations submitted by CEO or CTO will appear here.' : 'Verified appraisals from your lead or manager will appear here.')
                  : (user?.role === 'PM' ? 'Click "+ Give Feedback" above to review your Team Leads.' : 'Click "+ Give Feedback" above to submit an assessment.')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Give Feedback Modal */}
      {showModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px'
          }}
        >
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-float)'
          }}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  Submit Performance Feedback
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  {user?.role === 'PM' ? 'Deliver feedback to a designated Team Lead' : 'Provide formal evaluation and rating'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--status-blocked-bg)',
                color: 'var(--status-blocked)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {formError}
              </div>
            )}

            {successMsg && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--status-completed-bg)',
                color: 'var(--status-completed)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">
                  Recipient ({user?.role === 'PM' ? 'Team Lead *' : 'User *'})
                </label>
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">-- Select {user?.role === 'PM' ? 'Team Lead' : 'Recipient'} * --</option>
                  {targets.map(t => (
                    <option key={t.id} value={t.id}>
                      {getUserFullName(t)} ({t.role} - {getRoleDesc(t.role)})
                    </option>
                  ))}
                </select>
                {targets.length === 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    No eligible recipients available for your role at this time.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">
                  Related Project (Optional)
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="input"
                >
                  <option value="">-- General / Departmental Feedback --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">
                  Rating: <strong style={{ color: '#D97706' }}>{rating} Star{rating === 1 ? '' : 's'}</strong>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <Star
                        size={24}
                        fill={(hoverRating || rating) >= star ? '#F59E0B' : 'transparent'}
                        stroke="#F59E0B"
                        style={{ transition: 'transform 0.15s ease' }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">
                  Evaluation Comments *
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Provide qualitative feedback, leadership insights, deliverable quality, and key strengths..."
                  className="input"
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || targets.length === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={14} />
                  <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;
