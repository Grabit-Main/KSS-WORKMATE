import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckSquare, Sparkles } from 'lucide-react';
import { getTasks } from '../api/tasks';

export default function CalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 26)); // September 2026

  useEffect(() => {
    getTasks()
      .then(res => {
        if (Array.isArray(res)) setTasks(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysArray = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px 32px',
        marginBottom: '28px',
        border: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <CalendarIcon size={18} color="var(--brand-600)" />
            <span style={{ color: 'var(--brand-600)', fontSize: '13px', fontWeight: 600 }}>Schedule & Deadlines</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Project & Task Calendar
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={prevMonth} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', minWidth: '160px', textAlign: 'center' }}>
            {monthName}
          </span>
          <button onClick={nextMonth} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card" style={{ padding: '24px', overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', minWidth: '700px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 700, fontSize: '13px', color: 'var(--text-tertiary)', paddingBottom: '10px' }}>
              {day}
            </div>
          ))}

          {daysArray.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty-${idx}`} style={{ minHeight: '100px', background: 'transparent' }} />;
            }

            const dayTasks = tasks.filter(t => {
              if (!t.due_date) return false;
              const dt = new Date(t.due_date);
              return dt.getDate() === dayNum && dt.getMonth() === currentDate.getMonth() && dt.getFullYear() === currentDate.getFullYear();
            });

            const isToday = dayNum === 26 && currentDate.getMonth() === 8 && currentDate.getFullYear() === 2026;

            return (
              <div
                key={`day-${dayNum}`}
                style={{
                  minHeight: '110px',
                  background: isToday ? 'var(--brand-50)' : 'var(--surface)',
                  borderRadius: 'var(--radius-md)',
                  border: isToday ? '2px solid var(--brand-500)' : '1px solid var(--border)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--brand-600)' : 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{dayNum}</span>
                  {isToday && <span style={{ fontSize: '10px', background: 'var(--brand-500)', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>TODAY</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
                  {dayTasks.map(t => (
                    <div
                      key={t.id}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: t.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        color: t.status === 'completed' ? '#10B981' : 'var(--brand-600)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
