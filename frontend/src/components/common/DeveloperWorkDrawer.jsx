import React, { useState, useEffect, useCallback } from 'react';
import {
  X, User, CheckSquare, TrendingUp, FileText, AlertTriangle, HelpCircle,
  Flame, Activity, ShieldAlert, ShieldCheck, Lock, Eye, Edit3, Trash2, Calendar
} from 'lucide-react';
import { getTasks, updateTask, deleteTask } from '../../api/tasks';
import { getDailyPulses, getBlockers, getHelpRequests, getFocusSessions } from '../../api/mywork';
import TaskDetailsModal from '../tasks/TaskDetailsModal';

export default function DeveloperWorkDrawer({ isOpen, onClose, developer, role = 'TM', projectContext = null, onRefresh }) {
  const isTL = role === 'TL';
  const isReadOnly = ['PM', 'CTO', 'CEO'].includes(role);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'tasks', 'progress', 'pulse', 'blockers', 'help', 'focus', 'activity'
  const [developerTasks, setDeveloperTasks] = useState([]);
  const [dailyPulse, setDailyPulse] = useState(null);
  const [blockersList, setBlockersList] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [focusHistory, setFocusHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editProgressTask, setEditProgressTask] = useState(null);
  const [newProgressVal, setNewProgressVal] = useState(50);

  const todayStr = new Date().toISOString().split('T')[0];
  const targetDevId = developer?.id || developer?.user_id || developer?._id;

  // Load Developer Data from Backend DB
  const loadDevData = useCallback(async () => {
    if (!targetDevId) return;
    setLoading(true);
    try {
      const [allTasks, pulseRes, blockersRes, helpRes, focusRes] = await Promise.all([
        getTasks().catch(() => []),
        getDailyPulses(targetDevId).catch(() => []),
        getBlockers(targetDevId).catch(() => []),
        getHelpRequests(targetDevId).catch(() => []),
        getFocusSessions(targetDevId).catch(() => [])
      ]);

      if (Array.isArray(allTasks)) {
        const devIdStr = String(targetDevId).toLowerCase();
        const filtered = allTasks.filter((t) => 
          String(t.assigned_to || '').toLowerCase() === devIdStr || 
          String(t.assigned_by || '').toLowerCase() === devIdStr ||
          String(t.assignee?.id || '').toLowerCase() === devIdStr
        );
        setDeveloperTasks(filtered);
      }
      if (Array.isArray(pulseRes) && pulseRes.length > 0) {
        setDailyPulse(pulseRes[0]);
      }
      if (Array.isArray(blockersRes)) {
        setBlockersList(blockersRes);
      }
      if (Array.isArray(helpRes)) {
        setHelpRequests(helpRes);
      }
      if (Array.isArray(focusRes)) {
        setFocusHistory(focusRes);
      }
    } catch (err) {
      console.error('Failed to load developer data:', err);
    } finally {
      setLoading(false);
    }
  }, [targetDevId]);

  useEffect(() => {
    if (isOpen && targetDevId) {
      loadDevData();
    }
  }, [isOpen, targetDevId, loadDevData]);

  if (!isOpen || !developer) return null;

  const devName = `${developer.first_name || ''} ${developer.last_name || ''}`.trim() || developer.email || 'Developer';
  const devRole = developer.role || 'Developer';

  // Summary counts
  const totalTasks = developerTasks.length;
  const inProgressTasks = developerTasks.filter((t) => t.status === 'in_progress').length;
  const completedTasks = developerTasks.filter((t) => t.status === 'completed').length;
  const blockedTasks = developerTasks.filter((t) => t.status === 'blocked').length;

  const totalFocusSecs = focusHistory.reduce((acc, f) => acc + (f.activeDurationSecs || 0), 0);
  const focusMins = Math.round(totalFocusSecs / 60);

  // TL CRUD Handlers
  const handleTLDeleteTask = async (taskId) => {
    if (!isTL) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(taskId);
      loadDevTasks();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete task.');
    }
  };

  const handleTLUpdateProgress = async (e) => {
    e.preventDefault();
    if (!editProgressTask || !isTL) return;
    try {
      await updateTask(editProgressTask.id, {
        progress: Number(newProgressVal),
        status: Number(newProgressVal) === 100 ? 'completed' : editProgressTask.status
      });
      setEditProgressTask(null);
      loadDevTasks();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to update progress.');
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'tasks', label: `Tasks (${totalTasks})`, icon: CheckSquare },
    { key: 'progress', label: 'Progress', icon: TrendingUp },
    { key: 'pulse', label: 'Daily Pulse', icon: FileText },
    { key: 'blockers', label: `Blockers (${blockersList.length})`, icon: AlertTriangle },
    { key: 'help', label: `Help (${helpRequests.length})`, icon: HelpCircle },
    { key: 'focus', label: 'Focus Sessions', icon: Flame },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 400
    }}>
      <div style={{
        width: '100%',
        maxWidth: '720px',
        height: '100%',
        background: '#FFFFFF',
        boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.25s ease-out forwards'
      }}>
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Drawer Header */}
        <div style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#6366F1',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 800
            }}>
              {devName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#F8FAFC' }}>
                  {devName}
                </h2>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: '#818CF8'
                }}>
                  {devRole}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>
                {developer.email} • {developer.department || 'Engineering'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Access Mode Tag */}
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              background: isReadOnly ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: isReadOnly ? '#F59E0B' : '#10B981',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {isReadOnly ? <Eye size={12} /> : <Edit3 size={12} />}
              {isReadOnly ? `${role} View Only` : 'TL Manager CRUD'}
            </span>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#94A3B8'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          borderBottom: '1px solid #E2E8F0',
          background: '#F8FAFC',
          padding: '0 16px'
        }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '14px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #6366F1' : '3px solid transparent',
                  color: isActive ? '#6366F1' : '#64748B',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Drawer Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#FFFFFF' }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Active Tasks</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{totalTasks}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>In Progress</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>{inProgressTasks}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Completed</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{completedTasks}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Total Focus Time</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#6366F1', marginTop: '4px' }}>{focusMins} mins</div>
                </div>
              </div>

              {/* Latest Daily Pulse Summary */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} color="#F59E0B" /> Today's Pulse Status
                </h4>
                {dailyPulse ? (
                  <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><strong>Status:</strong> {dailyPulse.overallStatus?.replace('_', ' ').toUpperCase()}</div>
                    {dailyPulse.completedToday && <div><strong>Completed:</strong> {dailyPulse.completedToday}</div>}
                    {dailyPulse.currentlyWorking && <div><strong>Working On:</strong> {dailyPulse.currentlyWorking}</div>}
                    {dailyPulse.blockerConcern && <div style={{ color: '#DC2626' }}><strong>Blocker:</strong> {dailyPulse.blockerConcern}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#94A3B8' }}>No daily pulse submitted yet for today.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TASKS */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {loading ? (
                <div style={{ color: '#64748B', fontSize: '14px' }}>Loading tasks...</div>
              ) : developerTasks.length === 0 ? (
                <div style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', padding: '30px' }}>No tasks assigned to this developer.</div>
              ) : (
                developerTasks.map((t) => (
                  <div key={t.id} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6366F1', textTransform: 'uppercase' }}>
                          {t.project?.name || 'Project Task'}
                        </span>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '2px 0 0 0' }}>{t.title}</h4>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: t.status === 'completed' ? '#ECFDF5' : t.status === 'blocked' ? '#FEF2F2' : '#EFF6FF',
                        color: t.status === 'completed' ? '#10B981' : t.status === 'blocked' ? '#EF4444' : '#3B82F6'
                      }}>
                        {t.status ? t.status.replace('_', ' ').toUpperCase() : 'PENDING'}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{t.description}</p>

                    {/* TL CRUD Controls or Read-only Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>Due: {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'N/A'}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedTask(t)}
                          style={{ padding: '4px 10px', fontSize: '12px', background: '#EEF2FF', color: '#4F46E5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          View Details
                        </button>
                        {isTL && (
                          <button
                            onClick={() => handleTLDeleteTask(t.id)}
                            style={{ padding: '4px 10px', fontSize: '12px', background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PROGRESS */}
          {activeTab === 'progress' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {developerTasks.map((t) => {
                const prog = t.progress ?? (t.status === 'completed' ? 100 : 50);
                return (
                  <div key={t.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{t.title}</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#10B981' }}>{prog}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${prog}%`, height: '100%', background: '#10B981' }} />
                    </div>

                    {isTL && (
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setEditProgressTask(t);
                            setNewProgressVal(prog);
                          }}
                          style={{ padding: '4px 12px', fontSize: '12px', background: '#6366F1', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Correct Progress
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: DAILY PULSE */}
          {activeTab === 'pulse' && (
            <div>
              {dailyPulse ? (
                <div style={{ padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Overall: {dailyPulse.overallStatus?.replace('_', ' ').toUpperCase()}</div>
                  {dailyPulse.completedToday && <div><strong>Completed Today:</strong> {dailyPulse.completedToday}</div>}
                  {dailyPulse.currentlyWorking && <div><strong>Currently Working On:</strong> {dailyPulse.currentlyWorking}</div>}
                  {dailyPulse.blockerConcern && <div style={{ color: '#DC2626' }}><strong>Blocker:</strong> {dailyPulse.blockerConcern}</div>}
                  {dailyPulse.nextFocus && <div><strong>Next Focus:</strong> {dailyPulse.nextFocus}</div>}
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>Submitted at {dailyPulse.submittedAt}</div>
                </div>
              ) : (
                <div style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', padding: '30px' }}>No pulse submitted for today.</div>
              )}
            </div>
          )}

          {/* TAB 5: BLOCKERS */}
          {activeTab === 'blockers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {blockersList.length === 0 ? (
                <div style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', padding: '30px' }}>No active blockers reported.</div>
              ) : (
                blockersList.map((b) => (
                  <div key={b.id} style={{ padding: '16px', borderRadius: '12px', borderLeft: '4px solid #EF4444', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase' }}>{b.type} Blocker ({b.severity})</span>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>{b.reportedTime}</span>
                    </div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>{b.taskTitle}</h4>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{b.description}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 6: HELP REQUESTS */}
          {activeTab === 'help' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {helpRequests.length === 0 ? (
                <div style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', padding: '30px' }}>No help requests filed.</div>
              ) : (
                helpRequests.map((hr) => (
                  <div key={hr.id} style={{ padding: '16px', borderRadius: '12px', borderLeft: '4px solid #8B5CF6', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#8B5CF6' }}>{hr.helpType} ({hr.priority})</span>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>{hr.createdTime}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 6px 0' }}>{hr.description}</p>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>To: {hr.helperName}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 7: FOCUS SESSIONS */}
          {activeTab === 'focus' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {focusHistory.length === 0 ? (
                <div style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', padding: '30px' }}>No completed focus sessions yet.</div>
              ) : (
                focusHistory.map((f, i) => (
                  <div key={i} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{f.taskTitle}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#6366F1' }}>{Math.round((f.activeDurationSecs || 0) / 60)} min</span>
                    </div>
                    {f.accomplishment && <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>{f.accomplishment}</p>}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            loadDevTasks();
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* TL Edit Progress Modal */}
      {editProgressTask && isTL && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <form onSubmit={handleTLUpdateProgress} className="card" style={{ width: '400px', padding: '24px', background: '#FFFFFF', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: '#0F172A' }}>Correct Developer Progress</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Progress (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newProgressVal}
                onChange={(e) => setNewProgressVal(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setEditProgressTask(null)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#6366F1' }}>Save Correction</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
