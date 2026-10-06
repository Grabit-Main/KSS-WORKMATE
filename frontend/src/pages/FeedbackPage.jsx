import React, { useEffect, useState, useCallback } from 'react';
import { getFeedback, getFeedbackTargets, submitFeedback } from '../api/feedback';
import { getProjects } from '../api/projects';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import { Star, MessageSquareQuote, Plus, X, UserCheck, Shield, Send, Truck, CheckCircle2, TrendingUp, FileText, Calendar } from 'lucide-react';

const parseFeedbackComment = (commentText, rating) => {
  if (!commentText || !commentText.trim()) {
    return {
      strengths: 'Successfully completed the assigned tasks on time with good ownership and implementation of core workflows.',
      improvements: 'Improve testing depth, edge-case validation, documentation and regression testing.',
      assessment: 'Meets delivery expectations, but needs improvement in testing discipline and production readiness.'
    };
  }

  const text = commentText.trim();

  // Try matching explicit section headings if present in text
  const strengthsMatch = text.match(/(?:strengths?|key strengths?):\s*([^]+?)(?=(?:areas? for improvement|improvements?|final assessment|assessment):|$)/i);
  const improvementsMatch = text.match(/(?:areas? for improvement|improvements?|focus areas?):\s*([^]+?)(?=(?:final assessment|assessment|strengths?):|$)/i);
  const assessmentMatch = text.match(/(?:final assessment|assessment|summary):\s*([^]+?)(?=(?:strengths?|areas? for improvement):|$)/i);

  if (strengthsMatch || improvementsMatch || assessmentMatch) {
    return {
      strengths: strengthsMatch?.[1]?.trim() || text,
      improvements: improvementsMatch?.[1]?.trim() || 'Improve testing depth, edge-case validation, documentation and regression testing.',
      assessment: assessmentMatch?.[1]?.trim() || (rating >= 3 ? 'Meets delivery expectations, maintaining consistent project progress and discipline.' : 'Requires structured performance improvement plan to meet core expectations.')
    };
  }

  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

  if (sentences.length >= 3) {
    return {
      strengths: sentences[0],
      improvements: sentences[1],
      assessment: sentences.slice(2).join(' ')
    };
  } else if (sentences.length === 2) {
    return {
      strengths: sentences[0],
      improvements: sentences[1],
      assessment: rating >= 4 
        ? 'Exceeds delivery expectations with strong technical ownership and milestone readiness.'
        : rating >= 3 
        ? 'Meets delivery expectations, maintaining consistent project progress and discipline.'
        : 'Requires targeted improvements in testing discipline and execution consistency.'
    };
  } else {
    return {
      strengths: text,
      improvements: rating >= 4
        ? 'Continue driving code quality, performance optimizations, and technical documentation.'
        : 'Improve testing depth, edge-case validation, documentation and regression testing.',
      assessment: rating >= 4
        ? 'Exceeds delivery expectations with strong technical ownership and milestone readiness.'
        : rating >= 3
        ? 'Meets delivery expectations, but needs improvement in testing discipline and production readiness.'
        : 'Requires targeted guidance to meet delivery standards and project benchmarks.'
    };
  }
};

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
  const [strengthsInput, setStrengthsInput] = useState('');
  const [improvementsInput, setImprovementsInput] = useState('');
  const [assessmentInput, setAssessmentInput] = useState('');
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

    if (!strengthsInput.trim() && !improvementsInput.trim() && !assessmentInput.trim()) {
      setFormError('Please fill in evaluation feedback details (Strengths, Areas for Improvement, or Final Assessment).');
      return;
    }

    const parts = [];
    if (strengthsInput.trim()) parts.push(`STRENGTHS:\n${strengthsInput.trim()}`);
    if (improvementsInput.trim()) parts.push(`AREAS FOR IMPROVEMENT:\n${improvementsInput.trim()}`);
    if (assessmentInput.trim()) parts.push(`FINAL ASSESSMENT:\n${assessmentInput.trim()}`);
    const combinedComment = parts.join('\n\n');

    setSubmitting(true);
    setFormError('');
    try {
      await submitFeedback({
        reviewee_id: selectedTargetId,
        project_id: selectedProjectId || null,
        rating,
        comment: combinedComment
      });
      setSuccessMsg('Feedback submitted successfully!');
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg('');
        setSelectedTargetId('');
        setSelectedProjectId('');
        setStrengthsInput('');
        setImprovementsInput('');
        setAssessmentInput('');
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))', gap: '20px' }}>
          {[1,2,3,4].map(i => <div key={i} className="card skeleton" style={{ height: '320px', borderRadius: '18px' }}></div>)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))', gap: '20px' }}>
          {feedbackList.map(r => {
            const displayUser = activeTab === 'received' ? r.reviewer : r.reviewee;
            const roleLabel = activeTab === 'received' ? 'Reviewed by' : 'Reviewee';
            const proj = projects.find(p => p.id === r.project_id || p.id === r.project?.id);
            const projName = proj?.name || r.project?.name || r.project_name || 'Logistics / Transportation Management System';
            const ratingVal = r.rating || 5;
            const ratingLabel = ratingVal >= 4.5 ? 'Exceeds Expectations' : ratingVal >= 3 ? 'Meets Expectations' : 'Needs Improvement';
            const sections = parseFeedbackComment(r.comment || r.feedback, ratingVal);

            return (
              <div
                key={r.id}
                style={{
                  background: 'var(--surface, #ffffff)',
                  border: '1px solid var(--border-subtle, #E2E8F0)',
                  borderRadius: '18px',
                  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all var(--transition-smooth)'
                }}
              >
                {/* Top Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={18}
                          fill={star <= ratingVal ? '#F59E0B' : 'transparent'}
                          stroke={star <= ratingVal ? '#F59E0B' : '#CBD5E1'}
                          strokeWidth={star <= ratingVal ? 1 : 1.5}
                        />
                      ))}
                    </div>

                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      background: '#EFF6FF',
                      color: '#2563EB',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}>
                      {Number(ratingVal).toFixed(1)} / 5.0
                    </span>

                    <span style={{ color: '#CBD5E1', fontSize: '13px', fontWeight: 300 }}>|</span>

                    <span style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      background: '#F3E8FF',
                      color: '#7C3AED',
                      padding: '4px 14px',
                      borderRadius: '9999px',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}>
                      {ratingLabel}
                    </span>
                  </div>
                </div>

                {/* Subheader Project Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Truck size={20} style={{ color: '#3B82F6', flexShrink: 0 }} />
                  <h4 style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary, #0F172A)', margin: 0 }}>
                    {projName}
                  </h4>
                </div>

                {/* 3 Content Sections */}
                {/* Section 1: Strengths */}
                <div style={{ borderTop: '1px solid var(--border-subtle, #F1F5F9)', paddingTop: '16px', paddingBottom: '14px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <CheckCircle2 size={18} style={{ color: '#16A34A' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#16A34A', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '4px' }}>
                      STRENGTHS
                    </div>
                    <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--text-secondary, #475569)' }}>
                      {sections.strengths}
                    </div>
                  </div>
                </div>

                {/* Section 2: Areas for Improvement */}
                <div style={{ borderTop: '1px solid var(--border-subtle, #F1F5F9)', paddingTop: '16px', paddingBottom: '14px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#FFEDD5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <TrendingUp size={18} style={{ color: '#EA580C' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#EA580C', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '4px' }}>
                      AREAS FOR IMPROVEMENT
                    </div>
                    <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--text-secondary, #475569)' }}>
                      {sections.improvements}
                    </div>
                  </div>
                </div>

                {/* Section 3: Final Assessment */}
                <div style={{ borderTop: '1px solid var(--border-subtle, #F1F5F9)', paddingTop: '16px', paddingBottom: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <FileText size={18} style={{ color: '#2563EB' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#2563EB', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '4px' }}>
                      FINAL ASSESSMENT
                    </div>
                    <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--text-secondary, #475569)' }}>
                      {sections.assessment}
                    </div>
                  </div>
                </div>

                {/* Bottom Footer User Info & Date */}
                <div style={{
                  borderTop: '1px solid var(--border-subtle, #F1F5F9)',
                  paddingTop: '16px',
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {displayUser?.avatar_url ? (
                      <img
                        src={displayUser.avatar_url}
                        alt=""
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--brand-gradient, linear-gradient(135deg, #6366F1, #8B5CF6))',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        {displayUser?.first_name?.[0]}{displayUser?.last_name?.[0]}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#64748B', fontSize: '12px', fontWeight: 500 }}>{roleLabel}:</span>
                      <strong style={{ color: 'var(--text-primary, #0F172A)', fontSize: '13.5px', fontWeight: 700 }}>{getUserFullName(displayUser)}</strong>
                      {displayUser?.role && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: 'var(--subtle, #F1F5F9)',
                          color: 'var(--text-secondary, #475569)',
                          marginLeft: '2px'
                        }}>
                          {displayUser.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '12.5px', fontWeight: 500 }}>
                    <Calendar size={15} />
                    <span>
                      {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
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
            maxWidth: '600px',
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
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Hidden SVG Gradient Definition for Half Star */}
            <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
              <defs>
                <linearGradient id="half-star-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>

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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
                  Related Project
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
                  Rating: <strong style={{ color: '#D97706' }}>{Number(rating).toFixed(1)} Stars</strong>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const currentVal = hoverRating || rating;
                    const isFull = currentVal >= star;
                    const isHalf = !isFull && currentVal >= star - 0.5;

                    return (
                      <div
                        key={star}
                        style={{ position: 'relative', display: 'inline-flex', cursor: 'pointer', padding: '2px' }}
                        onMouseLeave={() => setHoverRating(0)}
                      >
                        {/* Left half hover/click overlay */}
                        <div
                          style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', zIndex: 2 }}
                          onMouseEnter={() => setHoverRating(star - 0.5)}
                          onClick={() => setRating(star - 0.5)}
                        />
                        {/* Right half hover/click overlay */}
                        <div
                          style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', zIndex: 2 }}
                          onMouseEnter={() => setHoverRating(star)}
                          onClick={() => setRating(star)}
                        />
                        <Star
                          size={26}
                          fill={isFull ? '#F59E0B' : isHalf ? 'url(#half-star-grad)' : 'transparent'}
                          stroke={isFull || isHalf ? '#F59E0B' : '#CBD5E1'}
                          strokeWidth={1.5}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Quick Select Rating Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRating(v)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: rating === v ? 700 : 500,
                        background: rating === v ? '#EFF6FF' : '#F8FAFC',
                        color: rating === v ? '#2563EB' : '#64748B',
                        border: rating === v ? '1px solid #2563EB' : '1px solid #E2E8F0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {v.toFixed(1)} ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Strengths Field */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                  </div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#16A34A', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
                    STRENGTHS
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={strengthsInput}
                  onChange={(e) => setStrengthsInput(e.target.value)}
                  placeholder="Describe key achievements, ownership, UI details, deliverable quality, and core strengths..."
                  className="input"
                  style={{ resize: 'vertical', background: '#FFFFFF' }}
                />
              </div>

              {/* Areas for Improvement Field */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#FFEDD5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <TrendingUp size={14} style={{ color: '#EA580C' }} />
                  </div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#EA580C', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
                    AREAS FOR IMPROVEMENT
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={improvementsInput}
                  onChange={(e) => setImprovementsInput(e.target.value)}
                  placeholder="Detail target focus areas, testing depth, edge-case validation, documentation, and regression testing..."
                  className="input"
                  style={{ resize: 'vertical', background: '#FFFFFF' }}
                />
              </div>

              {/* Final Assessment Field */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FileText size={14} style={{ color: '#2563EB' }} />
                  </div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#2563EB', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
                    FINAL ASSESSMENT
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={assessmentInput}
                  onChange={(e) => setAssessmentInput(e.target.value)}
                  placeholder="Overall appraisal summary, delivery expectations, production readiness, and final verdict..."
                  className="input"
                  style={{ resize: 'vertical', background: '#FFFFFF' }}
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
