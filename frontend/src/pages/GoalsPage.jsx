import React, { useState } from 'react';
import { Target, Award, TrendingUp, CheckCircle, Flame, Plus, Calendar, Star } from 'lucide-react';

export default function GoalsPage() {
  const [goals, setGoals] = useState([
    {
      id: 1,
      title: 'Q3 Product Stability & Zero Critical Bugs',
      category: 'Engineering & Quality',
      target_date: '2026-10-31',
      progress: 85,
      status: 'On Track',
      description: 'Achieve zero critical production issues and complete database redundancy checks.'
    },
    {
      id: 2,
      title: 'Team KPI Logging Compliance > 95%',
      category: 'Operations',
      target_date: '2026-09-30',
      progress: 92,
      status: 'On Track',
      description: 'Maintain 95%+ daily KPI log submission across all active team members.'
    },
    {
      id: 3,
      title: 'Automated CI/CD Deployment Pipeline',
      category: 'DevOps',
      target_date: '2026-11-15',
      progress: 60,
      status: 'At Risk',
      description: 'Implement automated unit testing & deployment verifications on Render & Vercel.'
    }
  ]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        marginBottom: '28px',
        border: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Target size={18} color="var(--brand-600)" />
            <span style={{ color: 'var(--brand-600)', fontSize: '13px', fontWeight: 600 }}>Company & Team Targets</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Goals & Growth Milestones
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Track quarterly OKRs, key performance milestones, and individual growth metrics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="card" style={{ padding: '14px 24px', textAlign: 'center', background: 'var(--surface)' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--brand-600)' }}>88%</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Avg Goal Progress</div>
          </div>
          <div className="card" style={{ padding: '14px 24px', textAlign: 'center', background: 'var(--surface)' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#10B981' }}>3 / 3</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active OKRs</div>
          </div>
        </div>
      </div>

      {/* Goals Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {goals.map(g => (
          <div key={g.id} className="card card-hover" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'var(--brand-50)',
                  color: 'var(--brand-600)'
                }}>
                  {g.category}
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: g.status === 'On Track' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: g.status === 'On Track' ? '#10B981' : '#EF4444'
                }}>
                  {g.status}
                </span>
              </div>

              <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {g.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '20px' }}>
                {g.description}
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Target Progress</span>
                <span style={{ color: 'var(--brand-600)' }}>{g.progress}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ width: `${g.progress}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1, #8B5CF6)', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                <Calendar size={14} />
                <span>Target Date: {new Date(g.target_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
