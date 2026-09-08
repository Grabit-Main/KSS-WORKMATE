import React, { useState } from 'react';

export const TrendLineChart = ({
  data = [],
  title = "Performance Velocity Trend",
  subtitle = "Activity curve: Tasks completed vs newly created deliverables"
}) => {
  const [activeNode, setActiveNode] = useState(null);

  const width = 540;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Max value calculation
  const maxVal = Math.max(
    ...data.map(d => Math.max(d.completed || 0, d.created || 0, d.in_progress || 0)),
    4
  );

  const numPoints = data.length;
  const stepX = numPoints > 1 ? chartW / (numPoints - 1) : chartW;

  // Compute point coordinates
  const compPoints = data.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = height - paddingY - ((d.completed || 0) / maxVal) * chartH;
    return { x, y, val: d.completed || 0, ...d };
  });

  const createdPoints = data.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = height - paddingY - ((d.created || 0) / maxVal) * chartH;
    return { x, y, val: d.created || 0, ...d };
  });

  // Construct SVG Path
  const makeLinePath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    return pts.reduce((acc, pt, idx, arr) => {
      if (idx === 0) return `M ${pt.x},${pt.y}`;
      // Smooth Bézier curve
      const prev = arr[idx - 1];
      const cpX1 = prev.x + (pt.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (pt.x - prev.x) / 2;
      const cpY2 = pt.y;
      return `${acc} C ${cpX1},${cpY1} ${cpX2},${cpY2} ${pt.x},${pt.y}`;
    }, '');
  };

  const compPath = makeLinePath(compPoints);
  const createdPath = makeLinePath(createdPoints);

  // Area under curve
  const compArea = compPoints.length > 1
    ? `${compPath} L ${compPoints[compPoints.length - 1].x},${height - paddingY} L ${compPoints[0].x},${height - paddingY} Z`
    : '';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-base" style={{ letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <p className="text-xs text-secondary mt-0.5">{subtitle}</p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '3px', background: 'var(--status-completed)', borderRadius: '2px' }} />
            <span className="text-secondary font-medium">Completed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '3px', background: 'var(--brand-500)', borderRadius: '2px' }} />
            <span className="text-secondary font-medium">Created</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: `${height}px` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="compAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="brandAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = height - paddingY - ratio * chartH;
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-tertiary)"
                  fontWeight="500"
                >
                  {Math.round(ratio * maxVal)}
                </text>
              </g>
            );
          })}

          {/* Shaded Area */}
          {compArea && <path d={compArea} fill="url(#compAreaGrad)" />}

          {/* Created line */}
          {createdPath && (
            <path
              d={createdPath}
              fill="none"
              stroke="#6366F1"
              strokeWidth="2.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Completed line */}
          {compPath && (
            <path
              d={compPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {/* Completed Points & Hover nodes */}
          {compPoints.map((pt, idx) => (
            <g key={idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={activeNode === idx ? 6 : 4}
                fill="#10B981"
                stroke="var(--surface)"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'r 0.2s ease' }}
                onMouseEnter={() => setActiveNode(idx)}
                onMouseLeave={() => setActiveNode(null)}
              />
              <text
                x={pt.x}
                y={height - paddingY + 16}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-secondary)"
                fontWeight="500"
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Card */}
        {activeNode !== null && compPoints[activeNode] && (
          <div
            style={{
              position: 'absolute',
              top: `${compPoints[activeNode].y - 45}px`,
              left: `${compPoints[activeNode].x}px`,
              transform: 'translate(-50%, -100%)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              boxShadow: 'var(--shadow-float)',
              pointerEvents: 'none',
              zIndex: 10,
              fontSize: '11px',
              whiteSpace: 'nowrap'
            }}
          >
            <div className="font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {compPoints[activeNode].label}
            </div>
            <div style={{ color: 'var(--status-completed)', fontWeight: 600 }}>
              Completed: {compPoints[activeNode].completed}
            </div>
            <div style={{ color: 'var(--brand-600)', fontWeight: 600 }}>
              Created: {createdPoints[activeNode]?.created || 0}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
