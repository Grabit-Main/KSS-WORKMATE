import React, { useEffect, useRef, useState } from 'react';
import { CheckSquare, TrendingUp, FileText, AlertTriangle, HelpCircle } from 'lucide-react';

export default function QuickAddPopover({ isOpen, onClose, onSelectOption }) {
  const popoverRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const options = [
    {
      id: 'add_task',
      icon: CheckSquare,
      title: 'Add Task',
      description: 'Create a new work item',
      badge: 'Task',
      color: '#6366F1'
    },
    {
      id: 'log_progress',
      icon: TrendingUp,
      title: 'Log Progress',
      description: 'Update task progress',
      badge: 'Progress',
      color: '#10B981'
    },
    {
      id: 'daily_pulse',
      icon: FileText,
      title: 'Daily Pulse',
      description: "Share today's work status",
      badge: 'Pulse',
      color: '#F59E0B'
    },
    {
      id: 'report_blocker',
      icon: AlertTriangle,
      title: 'Report Blocker',
      description: 'Tell your team what is blocking your work',
      badge: 'Blocker',
      color: '#EF4444'
    },
    {
      id: 'ask_help',
      icon: HelpCircle,
      title: 'Ask Help',
      description: 'Request guidance or assistance',
      badge: 'Support',
      color: '#8B5CF6'
    }
  ];

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Keyboard navigation listener (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (options[activeIndex]) {
          onSelectOption(options[activeIndex].id);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, options, onSelectOption, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      role="menu"
      aria-label="Quick Add Options"
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '8px',
        width: '320px',
        background: 'var(--surface, #1E293B)',
        borderRadius: 'var(--radius-xl, 16px)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(99, 102, 241, 0.25)',
        backdropFilter: 'blur(24px)',
        zIndex: 9999,
        padding: '8px',
        animation: 'quickAddPopoverIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <style>{`
        @keyframes quickAddPopoverIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div style={{
        padding: '8px 12px 6px 12px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-tertiary, #94A3B8)',
        borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
        marginBottom: '6px'
      }}>
        Quick Actions
      </div>

      {options.map((opt, idx) => {
        const Icon = opt.icon;
        const isActive = activeIndex === idx;

        return (
          <button
            key={opt.id}
            role="menuitem"
            tabIndex={0}
            onClick={() => onSelectOption(opt.id)}
            onMouseEnter={() => setActiveIndex(idx)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-lg, 10px)',
              background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
              border: isActive ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              outline: 'none'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: `${opt.color}1E`,
              color: opt.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Icon size={18} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary, #F8FAFC)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {opt.title}
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-secondary, #94A3B8)',
                marginTop: '1px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {opt.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
