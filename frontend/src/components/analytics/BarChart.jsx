import React, { useState } from 'react';

export const BarChart = ({
  data = [],
  title = "Department Workload & Delivery",
  subtitle = "Comparative volume: Assigned vs Completed deliverables",
  primaryLabel = "Total Tasks",
  secondaryLabel = "Completed"
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Compute maximum value for scaling
  const maxVal = Math.max(
    ...data.map(d => Math.max(d.total_tasks || d.total || 0, d.completed || 0)),
    5
  );

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-base" style={{ letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <p className="text-xs text-secondary mt-0.5">{subtitle}</p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--brand-400)' }} />
            <span className="text-secondary font-medium">{primaryLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--status-completed)' }} />
            <span className="text-secondary font-medium">{secondaryLabel}</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
          No department records found for this period.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'space-around' }}>
          {data.map((item, idx) => {
            const total = item.total_tasks !== undefined ? item.total_tasks : (item.total || 0);
            const comp = item.completed || 0;
            const label = item.department || item.label || item.user_name || 'General';
            const rate = total > 0 ? Math.round((comp / total) * 100) : 0;
            const isHovered = hoveredIdx === idx;

            const totalWidthPct = Math.max((total / maxVal) * 100, 2);
            const compWidthPct = Math.max((comp / maxVal) * 100, comp > 0 ? 2 : 0);

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: isHovered ? 'var(--subtle)' : 'transparent',
                  transition: 'background var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12px' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}>
                    <span className="text-secondary">
                      <strong>{comp}</strong> / {total} closed
                    </span>
                    <span style={{
                      fontWeight: 700,
                      color: rate >= 70 ? 'var(--status-completed)' : 'var(--brand-600)',
                      background: rate >= 70 ? 'var(--status-completed-bg)' : 'var(--brand-50)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-xs)'
                    }}>
                      {rate}%
                    </span>
                  </div>
                </div>

                {/* Progress Dual Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {/* Total bar */}
                  <div style={{
                    width: '100%',
                    height: '7px',
                    background: 'var(--subtle)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${totalWidthPct}%`,
                      height: '100%',
                      background: isHovered ? 'var(--brand-600)' : 'var(--brand-300)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} />
                  </div>

                  {/* Completed bar */}
                  <div style={{
                    width: '100%',
                    height: '7px',
                    background: 'var(--subtle)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${compWidthPct}%`,
                      height: '100%',
                      background: 'var(--status-completed)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isHovered ? '0 0 6px rgba(16, 185, 129, 0.4)' : 'none'
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
