import React, { useState } from 'react';

export const PieChart = ({ data = [], totalTasks = 0, title = "Task Status Distribution" }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const total = totalTasks || data.reduce((acc, item) => acc + (item.count || 0), 0);

  // SVG Geometry
  const size = 260;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Compute SVG arcs
  let accumulatedAngle = -90; // Start at top

  const slices = data.map((item, idx) => {
    const value = item.count || 0;
    const sliceAngle = total > 0 ? (value / total) * 360 : 0;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + sliceAngle;
    accumulatedAngle += sliceAngle;

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate arc coordinates
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

    // Arc path command
    const pathData = total > 0 && value > 0
      ? sliceAngle >= 359.99
        ? `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.001} ${center - radius}`
        : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`
      : '';

    return {
      ...item,
      pathData,
      startAngle,
      endAngle,
      isHovered: hoveredIndex === idx
    };
  });

  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-base" style={{ letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <p className="text-xs text-secondary mt-0.5">Overall deliverable distribution breakdown</p>
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
          {total} Total
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '24px', flex: 1 }}>
        {/* SVG Donut */}
        <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background track circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--subtle)"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {total > 0 && slices.map((slice, idx) => {
              if (!slice.pathData) return null;
              return (
                <path
                  key={idx}
                  d={slice.pathData}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={slice.isHovered ? strokeWidth + 6 : strokeWidth}
                  strokeLinecap="round"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    filter: slice.isHovered ? `drop-shadow(0 4px 12px ${slice.color}66)` : 'none'
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center Text Readout */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center'
          }}>
            {activeItem ? (
              <>
                <span className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {activeItem.label}
                </span>
                <span className="text-2xl font-bold" style={{ color: activeItem.color, letterSpacing: '-0.03em' }}>
                  {activeItem.count}
                </span>
                <span className="text-xs text-secondary font-medium">
                  {activeItem.percentage}% of total
                </span>
              </>
            ) : (
              <>
                <span className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Completion
                </span>
                <span className="text-2xl font-bold" style={{ color: 'var(--brand-600)', letterSpacing: '-0.03em' }}>
                  {total > 0 ? `${Math.round(((data.find(d => d.status === 'completed')?.count || 0) / total) * 100)}%` : '0%'}
                </span>
                <span className="text-xs text-secondary font-medium">
                  Status Index
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px', flex: 1 }}>
          {data.map((item, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: isHovered ? 'var(--subtle)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: 'var(--radius-full)',
                    background: item.color,
                    boxShadow: isHovered ? `0 0 8px ${item.color}` : 'none',
                    transition: 'all var(--transition-fast)'
                  }} />
                  <span className="text-xs font-medium" style={{ color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {item.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong className="text-xs" style={{ color: 'var(--text-primary)' }}>{item.count}</strong>
                  <span className="text-xs text-secondary" style={{ width: '38px', textAlign: 'right' }}>
                    {item.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
