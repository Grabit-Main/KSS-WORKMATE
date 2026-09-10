import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getKPIs,
  getKPISummary,
  getKPITeammates,
  createOrUpdateKPI,
  updateKPI,
  downloadKPICSV
} from '../api/kpi';
import { useRealtime } from '../realtime/useRealtime';
import {
  TrendingUp,
  Download,
  Plus,
  Search,
  Filter,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  ChevronDown,
  X,
  Edit2,
  Eye,
  BarChart3,
  HelpCircle,
  BookOpen
} from 'lucide-react';

export const KPI_TIER_CONFIG = [
  { level: 1, name: 'Poor', short: '1 – Poor', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  { level: 2, name: 'Below Standard', short: '2 – Below Standard', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  { level: 3, name: 'Meets Standard', short: '3 – Meets Standard', bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  { level: 4, name: 'Strong', short: '4 – Strong', bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' },
  { level: 5, name: 'Exceptional', short: '5 – Exceptional', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
];

export const CRITERIA = [
  {
    key: 'task_completion',
    num: 1,
    label: 'Task Completion',
    weight: 3,
    maxContrib: 15,
    desc: 'Completion rate & execution accuracy',
    rubric: {
      1: '<50% committed work completed',
      2: '50–79% completed',
      3: '80–99% completed',
      4: '100% completed',
      5: '100% + meaningful additional work'
    }
  },
  {
    key: 'quality',
    num: 2,
    label: 'Quality',
    weight: 3,
    maxContrib: 15,
    desc: 'High standard of deliverable & low error rate',
    rubric: {
      1: 'Major errors / unusable output',
      2: 'Multiple errors / significant rework',
      3: 'Acceptable output with normal corrections',
      4: 'Very few minor corrections',
      5: 'Excellent output; no significant rework required'
    }
  },
  {
    key: 'productivity',
    num: 3,
    label: 'Productivity',
    weight: 3,
    maxContrib: 15,
    desc: 'Output volume & effective time management',
    rubric: {
      1: 'Very low useful output',
      2: 'Output significantly below expected',
      3: 'Expected output for available time',
      4: 'Above expected useful output',
      5: 'Significantly above expected output without quality loss'
    }
  },
  {
    key: 'deadline_adherence',
    num: 4,
    label: 'Deadline Adherence',
    weight: 2,
    maxContrib: 10,
    desc: 'Timely submission of milestones & tasks',
    rubric: {
      1: 'Major/repeated missed deadlines',
      2: 'Multiple delays',
      3: 'Generally meets deadlines',
      4: 'Consistently meets deadlines',
      5: 'Consistently early/on-time + proactively manages risks'
    }
  },
  {
    key: 'ownership',
    num: 5,
    label: 'Ownership',
    weight: 2,
    maxContrib: 10,
    desc: 'Proactive responsibility & accountability',
    rubric: {
      1: 'Avoids responsibility / leaves work incomplete',
      2: 'Frequent reminders required',
      3: 'Completes assigned work with normal supervision',
      4: 'Independently drives assigned work',
      5: 'Fully owns work, identifies risks and closes issues proactively'
    }
  },
  {
    key: 'problem_solving',
    num: 6,
    label: 'Problem Solving',
    weight: 2,
    maxContrib: 10,
    desc: 'Critical thinking & overcoming blockers',
    rubric: {
      1: 'Cannot resolve routine issues',
      2: 'Requires substantial assistance',
      3: 'Solves normal issues with reasonable guidance',
      4: 'Solves issues independently',
      5: 'Finds root cause + effective solution + prevents recurrence'
    }
  },
  {
    key: 'communication',
    num: 7,
    label: 'Communication',
    weight: 2,
    maxContrib: 10,
    desc: 'Clear, timely & transparent updates',
    rubric: {
      1: 'Critical communication failures',
      2: 'Repeated unclear/delayed updates',
      3: 'Required communication provided',
      4: 'Clear and timely communication',
      5: 'Proactive, clear communication that prevents problems'
    }
  },
  {
    key: 'team_collaboration',
    num: 8,
    label: 'Team Collaboration',
    weight: 1,
    maxContrib: 5,
    desc: 'Supportive teamwork & peer coordination',
    rubric: {
      1: 'Causes significant team obstruction',
      2: 'Repeated collaboration/dependency issues',
      3: 'Cooperates as required',
      4: 'Consistently effective team collaboration',
      5: 'Proactively unblocks/help others and improves team output'
    }
  },
  {
    key: 'learning_improvement',
    num: 9,
    label: 'Learning / Improvement',
    weight: 1,
    maxContrib: 5,
    desc: 'Adaptability & skill advancement',
    rubric: {
      1: 'Ignores required improvement',
      2: 'Little improvement despite feedback',
      3: 'Applies feedback and maintains required skills',
      4: 'Actively improves skills/process',
      5: 'Applies new knowledge and creates measurable improvement'
    }
  },
  {
    key: 'attendance_discipline',
    num: 10,
    label: 'Attendance & Discipline',
    weight: 1,
    maxContrib: 5,
    desc: 'Punctuality, presence & work ethics',
    rubric: {
      1: 'Serious/repeated violations',
      2: 'Frequent attendance/discipline issues',
      3: 'Meets company expectations',
      4: 'Very consistent attendance & discipline',
      5: 'Excellent consistency + exemplary adherence to policies'
    }
  }
];

const getStatusColor = (status) => {
  switch (status) {
    case 'Excellent':
      return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', bar: '#10B981' };
    case 'Very Good':
      return { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE', bar: '#6366F1' };
    case 'Meets Expectation':
      return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', bar: '#3B82F6' };
    case 'Needs Improvement':
      return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', bar: '#F59E0B' };
    case 'Needs Attention':
    default:
      return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', bar: '#EF4444' };
  }
};

const calculateLiveMetrics = (scores) => {
  let weightedSum = 0;
  CRITERIA.forEach((c) => {
    const val = Number(scores[c.key]) || 1;
    weightedSum += val * c.weight;
  });
  const pct = Math.round(weightedSum * 10) / 10;
  let status = 'Needs Attention';
  if (pct >= 90) status = 'Excellent';
  else if (pct >= 80) status = 'Very Good';
  else if (pct >= 70) status = 'Meets Expectation';
  else if (pct >= 60) status = 'Needs Improvement';

  return { pct, status };
};

const KpiPage = () => {
  const { user } = useAuth();

  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [teammates, setTeammates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [detailsLog, setDetailsLog] = useState(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Form state
  const initialForm = {
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    task_completion: 4,
    quality: 4,
    productivity: 4,
    deadline_adherence: 4,
    ownership: 4,
    problem_solving: 4,
    communication: 4,
    team_collaboration: 4,
    learning_improvement: 4,
    attendance_discipline: 5,
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  const isExecutive = ['CEO', 'CTO', 'PM'].includes(user?.role);
  const isTL = user?.role === 'TL';
  const isTM = user?.role === 'TM';
  const canDownload = isExecutive || isTL;
  const canGiveOrEdit = isTL;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [kpiData, summaryData, teamData] = await Promise.all([
        getKPIs({
          month: selectedMonth || undefined,
          status: selectedStatus || undefined,
          employee_id: selectedEmployeeId || undefined,
          date: selectedDate || undefined,
        }).catch(() => []),
        getKPISummary({
          month: selectedMonth || undefined,
          employee_id: selectedEmployeeId || undefined,
        }).catch(() => null),
        canGiveOrEdit || isExecutive ? getKPITeammates().catch(() => []) : Promise.resolve([]),
      ]);

      setLogs(kpiData);
      setSummary(summaryData);
      setTeammates(teamData);
    } catch (err) {
      console.error('Failed to load KPI data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedStatus, selectedEmployeeId, selectedDate, canGiveOrEdit, isExecutive]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Real-time refresh on KPI events
  useRealtime('kpi.logged', loadData);
  useRealtime('notification.new', loadData);

  // Filtered logs based on search term
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter((l) => {
      const empName = `${l.employee?.first_name || ''} ${l.employee?.last_name || ''}`.toLowerCase();
      const empEmail = (l.employee?.email || '').toLowerCase();
      const dept = (l.employee?.department || '').toLowerCase();
      const notes = (l.notes || '').toLowerCase();
      return empName.includes(term) || empEmail.includes(term) || dept.includes(term) || notes.includes(term);
    });
  }, [logs, searchTerm]);

  // Available months extracted from logs
  const availableMonths = useMemo(() => {
    const months = new Set(logs.map((l) => l.month).filter(Boolean));
    return Array.from(months);
  }, [logs]);

  const handleDownloadCSV = async () => {
    try {
      setDownloading(true);
      await downloadKPICSV({
        month: selectedMonth || undefined,
        status: selectedStatus || undefined,
        employee_id: selectedEmployeeId || undefined,
        date: selectedDate || undefined,
      });
    } catch (err) {
      console.error('Failed to download CSV:', err);
      alert('Failed to download CSV file.');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingLog(null);
    setFormData({
      ...initialForm,
      employee_id: teammates.length > 0 ? teammates[0].id : '',
      date: new Date().toISOString().split('T')[0],
    });
    setModalError('');
    setModalSuccess('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (log) => {
    setEditingLog(log);
    setFormData({
      employee_id: log.employee_id,
      date: log.date,
      task_completion: log.task_completion,
      quality: log.quality,
      productivity: log.productivity,
      deadline_adherence: log.deadline_adherence,
      ownership: log.ownership,
      problem_solving: log.problem_solving,
      communication: log.communication,
      team_collaboration: log.team_collaboration,
      learning_improvement: log.learning_improvement,
      attendance_discipline: log.attendance_discipline,
      notes: log.notes || '',
    });
    setModalError('');
    setModalSuccess('');
    setModalOpen(true);
  };

  const handleScoreChange = (key, val) => {
    setFormData((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    if (!formData.employee_id) {
      setModalError('Please select an employee.');
      return;
    }
    if (!formData.date) {
      setModalError('Please select a date.');
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.date > todayStr) {
      setModalError('Cannot allocate KPI for future dates. Only present and previous dates are allowed.');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      if (editingLog) {
        await updateKPI(editingLog.id, {
          task_completion: formData.task_completion,
          quality: formData.quality,
          productivity: formData.productivity,
          deadline_adherence: formData.deadline_adherence,
          ownership: formData.ownership,
          problem_solving: formData.problem_solving,
          communication: formData.communication,
          team_collaboration: formData.team_collaboration,
          learning_improvement: formData.learning_improvement,
          attendance_discipline: formData.attendance_discipline,
          notes: formData.notes,
        });
        setModalSuccess('KPI updated successfully!');
      } else {
        await createOrUpdateKPI(formData);
        setModalSuccess('Daily KPI logged successfully!');
      }

      setTimeout(() => {
        setModalOpen(false);
        setModalSuccess('');
        loadData();
      }, 1000);
    } catch (err) {
      console.error('Error saving KPI:', err);
      setModalError(err.response?.data?.detail || 'Failed to save KPI.');
    } finally {
      setSubmitting(false);
    }
  };

  const liveMetrics = useMemo(() => calculateLiveMetrics(formData), [formData]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
            }}>
              <TrendingUp size={22} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              KPI Tracker
            </h1>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: isExecutive ? '#EFF6FF' : isTL ? '#EEF2FF' : '#F1F5F9',
              color: isExecutive ? '#1E40AF' : isTL ? '#4F46E5' : '#475569',
              border: '1px solid currentColor',
              opacity: 0.9
            }}>
              {isExecutive && 'Executive View (All • Read-Only)'}
              {isTL && 'Team Lead View (Give & Edit)'}
              {isTM && 'Personal KPI View'}
              {user?.role === 'HR' && 'HR View (Read-Only)'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Daily employee performance tracking, weighted KPI calculations & evaluation logs.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Scoring Rules & Rubric Button */}
          <button
            onClick={() => setShowRulesModal(true)}
            title="View official KPI evaluation rules & scoring rubric"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              color: 'var(--brand-700, #4338CA)',
              border: '1px solid var(--brand-300, #C7D2FE)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-subtle)',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand-600)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--brand-300, #C7D2FE)'}
          >
            <BookOpen size={16} />
            <span>Scoring Rules</span>
          </button>

          {canDownload && (
            <button
              onClick={handleDownloadCSV}
              disabled={downloading || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: downloading ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-subtle)',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand-400)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <Download size={16} />
              <span>{downloading ? 'Downloading...' : 'Download CSV'}</span>
            </button>
          )}

          {canGiveOrEdit && (
            <button
              onClick={handleOpenCreateModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-gradient)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: 'var(--brand-glow)',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Plus size={16} />
              <span>Give Daily KPI</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Scoreboard Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* Average KPI Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Average KPI</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#EEF2FF', color: '#4F46E5' }}>
              <BarChart3 size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {summary ? `${summary.average_kpi}%` : '--'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Overall Score</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '999px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(summary?.average_kpi || 0, 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #6366F1 0%, #10B981 100%)',
              borderRadius: '999px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Total Evaluations Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Evaluations Logged</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#F1F5F9', color: '#475569' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {summary ? summary.total_logs : logs.length}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Total Days</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>
            Across active team members
          </span>
        </div>

        {/* Excellent & Very Good */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Top Performers</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#ECFDF5', color: '#059669' }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: '#059669' }}>
              {(summary?.status_counts?.['Excellent'] || 0) + (summary?.status_counts?.['Very Good'] || 0)}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>≥ 80.0% KPI</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', fontSize: '11px', fontWeight: 600 }}>
            <span style={{ color: '#065F46', background: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>
              {summary?.status_counts?.['Excellent'] || 0} Excellent
            </span>
            <span style={{ color: '#3730A3', background: '#EEF2FF', padding: '2px 6px', borderRadius: '4px' }}>
              {summary?.status_counts?.['Very Good'] || 0} Very Good
            </span>
          </div>
        </div>

        {/* Attention Needed */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Needs Attention / Impr.</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#FEF2F2', color: '#DC2626' }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: '#DC2626' }}>
              {(summary?.status_counts?.['Needs Attention'] || 0) + (summary?.status_counts?.['Needs Improvement'] || 0)}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>&lt; 70.0% KPI</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', fontSize: '11px', fontWeight: 600 }}>
            <span style={{ color: '#92400E', background: '#FFFBEB', padding: '2px 6px', borderRadius: '4px' }}>
              {summary?.status_counts?.['Needs Improvement'] || 0} Impr.
            </span>
            <span style={{ color: '#991B1B', background: '#FEF2F2', padding: '2px 6px', borderRadius: '4px' }}>
              {summary?.status_counts?.['Needs Attention'] || 0} Attn.
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-subtle)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Search */}
        <div style={{
          position: 'relative',
          flex: '1 1 240px',
          minWidth: '200px'
        }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search employee, dept, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        </div>

        {/* Month Filter */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            padding: '9px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            fontSize: '13px',
            color: 'var(--text-primary)',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="">All Months</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
          {/* Default popular months if not yet in logs */}
          {!availableMonths.includes('Sep-26') && <option value="Sep-26">Sep-26</option>}
          {!availableMonths.includes('Oct-26') && <option value="Oct-26">Oct-26</option>}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{
            padding: '9px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            fontSize: '13px',
            color: 'var(--text-primary)',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="">All Statuses</option>
          <option value="Excellent">Excellent (≥ 90%)</option>
          <option value="Very Good">Very Good (80-89%)</option>
          <option value="Meets Expectation">Meets Expectation (70-79%)</option>
          <option value="Needs Improvement">Needs Improvement (60-69%)</option>
          <option value="Needs Attention">Needs Attention (&lt; 60%)</option>
        </select>

        {/* Employee Filter (For Execs and TLs) */}
        {(isExecutive || isTL) && teammates.length > 0 && (
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Employees</option>
            {teammates.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.first_name} {tm.last_name} {tm.role ? `(${tm.role})` : ''}
              </option>
            ))}
          </select>
        )}

        {/* Calendar Date Filter (Present & Previous Dates Only) */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 12px',
          borderRadius: 'var(--radius-sm)',
          border: selectedDate ? '1.5px solid var(--brand-500)' : '1px solid var(--border)',
          background: 'var(--bg)',
          boxShadow: selectedDate ? '0 0 0 2px rgba(99, 102, 241, 0.15)' : 'none',
          transition: 'all var(--transition-fast)'
        }}>
          <Calendar size={15} style={{ color: selectedDate ? 'var(--brand-600)' : 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            type="date"
            title="Filter by evaluation date (previous and present dates only)"
            max={new Date().toISOString().split('T')[0]}
            value={selectedDate}
            onChange={(e) => {
              const val = e.target.value;
              const maxDate = new Date().toISOString().split('T')[0];
              if (val && val > maxDate) {
                alert("Future dates are not allowed. You can only view present and previous dates.");
                setSelectedDate(maxDate);
                return;
              }
              setSelectedDate(val);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          />
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate('')}
              title="Clear date filter"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '2px',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '50%'
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Reset Filter Button */}
        {(searchTerm || selectedMonth || selectedStatus || selectedEmployeeId || selectedDate) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedMonth('');
              setSelectedStatus('');
              setSelectedEmployeeId('');
              setSelectedDate('');
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Main KPI Logs Table */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)'
      }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Loading KPI records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Award size={48} style={{ color: 'var(--brand-300)', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              No KPI records found
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
              {isTL
                ? 'Click "Give Daily KPI" above to log performance scores for your team mates.'
                : 'No performance entries match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Employee</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Daily KPI %</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Key Criteria (1-5)</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Evaluator</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const statusStyle = getStatusColor(log.status);
                  const isOwnTeammate = isTL && teammates.some((t) => t.id === log.employee_id);

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--subtle-glass)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Date */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {log.date}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {log.month}
                        </span>
                      </td>

                      {/* Employee */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--brand-100)',
                            color: 'var(--brand-700)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            flexShrink: 0
                          }}>
                            {log.employee?.first_name?.[0] || 'E'}
                            {log.employee?.last_name?.[0] || ''}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {log.employee?.first_name} {log.employee?.last_name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              {log.employee?.department || log.employee?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Daily KPI % */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', minWidth: '46px' }}>
                            {log.daily_kpi_percentage.toFixed(1)}%
                          </span>
                          <div style={{ width: '60px', height: '6px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(log.daily_kpi_percentage, 100)}%`,
                              height: '100%',
                              background: statusStyle.bar,
                              borderRadius: '999px'
                            }} />
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: statusStyle.bg,
                          color: statusStyle.text,
                          border: `1px solid ${statusStyle.border}`
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusStyle.bar }} />
                          {log.status}
                        </span>
                      </td>

                      {/* Criteria Highlights */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span title="Task Completion" style={{ fontSize: '11px', padding: '2px 6px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                            Task: <strong>{log.task_completion}</strong>
                          </span>
                          <span title="Quality" style={{ fontSize: '11px', padding: '2px 6px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                            Qual: <strong>{log.quality}</strong>
                          </span>
                          <span title="Productivity" style={{ fontSize: '11px', padding: '2px 6px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                            Prod: <strong>{log.productivity}</strong>
                          </span>
                          <span title="Deadline Adherence" style={{ fontSize: '11px', padding: '2px 6px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                            Deadl: <strong>{log.deadline_adherence}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Evaluator */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {log.evaluator ? `${log.evaluator.first_name} ${log.evaluator.last_name}` : 'Team Lead'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => setDetailsLog(log)}
                            title="View Full Breakdown"
                            style={{
                              padding: '6px',
                              borderRadius: 'var(--radius-xs)',
                              border: '1px solid var(--border)',
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Only Team Lead can edit their teammates' KPIs */}
                          {canGiveOrEdit && isOwnTeammate && (
                            <button
                              onClick={() => handleOpenEditModal(log)}
                              title="Edit KPI"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid var(--brand-300)',
                                background: 'var(--brand-50)',
                                color: 'var(--brand-700)',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Give / Edit Modal (Team Lead only) */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-float)',
            width: '100%',
            maxWidth: '720px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg)'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {editingLog ? 'Edit Daily KPI' : 'Give Daily KPI to Team Mate'}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Evaluate 10 criteria on a scale of 1 to 5. Daily percentage & status update in real-time.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitModal} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {modalError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {modalSuccess && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    color: '#065F46',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle2 size={16} />
                    <span>{modalSuccess}</span>
                  </div>
                )}

                {/* Employee and Date Selectors */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Team Mate *
                    </label>
                    <select
                      value={formData.employee_id}
                      disabled={!!editingLog}
                      onChange={(e) => setFormData((prev) => ({ ...prev, employee_id: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: editingLog ? 'var(--subtle)' : 'var(--surface)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select Team Mate...</option>
                      {teammates.map((tm) => (
                        <option key={tm.id} value={tm.id}>
                          {tm.first_name} {tm.last_name} ({tm.department || 'TM'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      max={new Date().toISOString().split('T')[0]}
                      disabled={!!editingLog}
                      onChange={(e) => {
                        const val = e.target.value;
                        const maxDate = new Date().toISOString().split('T')[0];
                        if (val && val > maxDate) {
                          setModalError('Future dates are not allowed. You can only evaluate for present or previous dates.');
                          setFormData((prev) => ({ ...prev, date: maxDate }));
                          return;
                        }
                        setModalError('');
                        setFormData((prev) => ({ ...prev, date: val }));
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: editingLog ? 'var(--subtle)' : 'var(--surface)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Live Computed Summary Banner */}
                <div style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                  border: '1px solid #C7D2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#4338CA' }}>
                      Computed Daily KPI
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#312E81' }}>
                      {liveMetrics.pct.toFixed(1)}%
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#4338CA', marginBottom: '4px' }}>Resulting Status</div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      fontSize: '13px',
                      background: getStatusColor(liveMetrics.status).bg,
                      color: getStatusColor(liveMetrics.status).text,
                      border: `1px solid ${getStatusColor(liveMetrics.status).border}`
                    }}>
                      {liveMetrics.status}
                    </span>
                  </div>
                </div>

                {/* 10 Criteria Inputs */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Performance Criteria (Scores 1 to 5)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowRulesModal(true)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--brand-600, #4F46E5)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      <BookOpen size={13} />
                      <span>View Rules Table</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {CRITERIA.map((crit) => {
                      const currentVal = formData[crit.key] || 1;
                      const contrib = currentVal * crit.weight;
                      const activeTier = KPI_TIER_CONFIG.find((t) => t.level === currentVal) || KPI_TIER_CONFIG[2];
                      return (
                        <div
                          key={crit.key}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ flex: '1 1 200px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                                  {crit.num}. {crit.label}
                                </span>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: '#E0E7FF',
                                  color: '#4338CA'
                                }}>
                                  Wt: {crit.weight} ({crit.maxContrib}%)
                                </span>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                {crit.desc}
                              </span>
                            </div>

                            {/* 1-5 Rating Selector */}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {[1, 2, 3, 4, 5].map((num) => {
                                const isSelected = currentVal === num;
                                const tier = KPI_TIER_CONFIG.find((t) => t.level === num);
                                return (
                                  <button
                                    type="button"
                                    key={num}
                                    onClick={() => handleScoreChange(crit.key, num)}
                                    title={`Level ${num} (${tier?.name}): ${crit.rubric[num]}`}
                                    style={{
                                      width: '36px',
                                      height: '34px',
                                      borderRadius: 'var(--radius-xs)',
                                      border: isSelected ? '2px solid var(--brand-600)' : '1px solid var(--border)',
                                      background: isSelected ? tier?.bg : 'var(--surface)',
                                      color: isSelected ? tier?.text : 'var(--text-secondary)',
                                      fontWeight: 800,
                                      fontSize: '13px',
                                      cursor: 'pointer',
                                      transition: 'all var(--transition-fast)',
                                      boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                  >
                                    {num}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Dynamic Active Rubric Rule Definition */}
                          <div style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: activeTier.bg,
                            border: `1px solid ${activeTier.border}`,
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '8px',
                            fontSize: '12px',
                            lineHeight: 1.4
                          }}>
                            <span style={{
                              fontWeight: 700,
                              color: activeTier.text,
                              whiteSpace: 'nowrap'
                            }}>
                              Level {currentVal} ({activeTier.name}):
                            </span>
                            <span style={{ color: activeTier.text, fontWeight: 500 }}>
                              {crit.rubric[currentVal]}
                            </span>
                            <span style={{ marginLeft: 'auto', fontSize: '11px', color: activeTier.text, opacity: 0.85, whiteSpace: 'nowrap' }}>
                              {currentVal}/5 × {crit.weight} = {contrib}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Feedback & Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add specific comments or areas of focus for this day..."
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                background: 'var(--bg)'
              }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--brand-gradient)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: 'var(--brand-glow)'
                  }}
                >
                  {submitting ? 'Saving...' : editingLog ? 'Update KPI' : 'Save Daily KPI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-float)',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg)'
            }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  KPI Evaluation Breakdown
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {detailsLog.employee?.first_name} {detailsLog.employee?.last_name} • {detailsLog.date}
                </span>
              </div>
              <button
                onClick={() => setDetailsLog(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Score header */}
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: getStatusColor(detailsLog.status).bg,
                border: `1px solid ${getStatusColor(detailsLog.status).border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: getStatusColor(detailsLog.status).text }}>
                    DAILY KPI PERCENTAGE
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: getStatusColor(detailsLog.status).text }}>
                    {detailsLog.daily_kpi_percentage.toFixed(1)}%
                  </div>
                </div>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 700,
                  fontSize: '13px',
                  background: '#FFFFFF',
                  color: getStatusColor(detailsLog.status).text
                }}>
                  {detailsLog.status}
                </span>
              </div>

              {/* Criteria List with Rubric Explanations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                    Criteria Breakdown & Rubric
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRulesModal(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--brand-600, #4F46E5)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    <BookOpen size={13} />
                    <span>View Rules Table</span>
                  </button>
                </div>
                {CRITERIA.map((crit) => {
                  const val = detailsLog[crit.key] || 1;
                  const contrib = val * crit.weight;
                  const tier = KPI_TIER_CONFIG.find((t) => t.level === val) || KPI_TIER_CONFIG[2];
                  return (
                    <div
                      key={crit.key}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--bg)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                            {crit.num}. {crit.label}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            (Weight: {crit.weight})
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {val}/5 × {crit.weight} = <strong>{contrib}%</strong>
                          </span>
                          <span style={{
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: tier.bg,
                            color: tier.text,
                            border: `1px solid ${tier.border}`,
                            fontSize: '12px'
                          }}>
                            {val} – {tier.name}
                          </span>
                        </div>
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        background: 'var(--surface)',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        borderLeft: `3px solid ${tier.text}`,
                        lineHeight: 1.4
                      }}>
                        "{crit.rubric[val]}"
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              {detailsLog.notes && (
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    TL Notes & Observations:
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                    "{detailsLog.notes}"
                  </div>
                </div>
              )}

              {/* Evaluator details */}
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                Evaluated by: <strong>{detailsLog.evaluator ? `${detailsLog.evaluator.first_name} ${detailsLog.evaluator.last_name}` : 'Team Lead'}</strong>
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', textAlign: 'right', background: 'var(--bg)' }}>
              <button
                onClick={() => setDetailsLog(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official KPI Scoring Rules & Evaluation Rubric Modal */}
      {showRulesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '1050px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-modal)',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--brand-50, #EEF2FF)',
                  color: 'var(--brand-600, #4F46E5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Official KPI Scoring Rules & Evaluation Rubric
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                    Standardized 10-criteria evaluation rules (Scores 1–5) so grading is clear, objective, and transparent.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Tier Overview Badges */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '10px'
              }}>
                {KPI_TIER_CONFIG.map((t) => (
                  <div
                    key={t.level}
                    style={{
                      background: t.bg,
                      border: `1px solid ${t.border}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: t.text }}>Level {t.level}</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: '#FFFFFF',
                        color: t.text
                      }}>
                        {t.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: t.text, opacity: 0.9 }}>
                      {t.level === 1 && 'Critical issues / <50% completed'}
                      {t.level === 2 && 'Below expectations / delays & rework'}
                      {t.level === 3 && 'Expected output / meets standards'}
                      {t.level === 4 && 'Consistently exceeds / proactive'}
                      {t.level === 5 && 'Exemplary impact / solves root causes'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Master Rubric Table */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div className="table-responsive">
                  <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-primary)', width: '180px' }}>
                          KPI Criteria & Weight
                        </th>
                        <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: '#991B1B', background: '#FEF2F2', width: '16%' }}>
                          1 – Poor
                        </th>
                        <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: '#92400E', background: '#FFFBEB', width: '16%' }}>
                          2 – Below Standard
                        </th>
                        <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: '#1E40AF', background: '#EFF6FF', width: '16%' }}>
                          3 – Meets Standard
                        </th>
                        <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: '#3730A3', background: '#EEF2FF', width: '16%' }}>
                          4 – Strong
                        </th>
                        <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, color: '#065F46', background: '#ECFDF5', width: '18%' }}>
                          5 – Exceptional
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {CRITERIA.map((crit, idx) => (
                        <tr
                          key={crit.key}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: idx % 2 === 0 ? 'var(--surface)' : 'rgba(248, 250, 252, 0.5)'
                          }}
                        >
                          <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                              {crit.num}. {crit.label}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, background: '#E0E7FF', color: '#4338CA', padding: '1px 5px', borderRadius: '4px' }}>
                                Wt: {crit.weight}
                              </span>
                              <span style={{ fontSize: '10px', fontWeight: 600, background: '#F1F5F9', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>
                                Max {crit.maxContrib}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', verticalAlign: 'top', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {crit.rubric[1]}
                          </td>
                          <td style={{ padding: '12px 10px', verticalAlign: 'top', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {crit.rubric[2]}
                          </td>
                          <td style={{ padding: '12px 10px', verticalAlign: 'top', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {crit.rubric[3]}
                          </td>
                          <td style={{ padding: '12px 10px', verticalAlign: 'top', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {crit.rubric[4]}
                          </td>
                          <td style={{ padding: '12px 10px', verticalAlign: 'top', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {crit.rubric[5]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Formula & Status Guidelines */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '14px',
                background: 'var(--bg)',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Formula & Weighting Logic
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Daily KPI % is calculated by multiplying each criterion score (1–5) by its assigned weight (Sum of weights = 20), yielding a direct percentage out of 100%.
                    <br />
                    <strong>Weight 3 (15% Max):</strong> Task Completion, Quality, Productivity
                    <br />
                    <strong>Weight 2 (10% Max):</strong> Deadline Adherence, Ownership, Problem Solving, Communication
                    <br />
                    <strong>Weight 1 (5% Max):</strong> Team Collaboration, Learning / Improvement, Attendance & Discipline
                  </p>
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Overall Daily Status Thresholds
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#065F46', fontWeight: 600 }}>● Excellent:</span>
                      <span style={{ fontWeight: 700 }}>≥ 90.0%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#3730A3', fontWeight: 600 }}>● Very Good:</span>
                      <span style={{ fontWeight: 700 }}>80.0% – 89.9%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#1E40AF', fontWeight: 600 }}>● Meets Expectation:</span>
                      <span style={{ fontWeight: 700 }}>70.0% – 79.9%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#92400E', fontWeight: 600 }}>● Needs Improvement:</span>
                      <span style={{ fontWeight: 700 }}>60.0% – 69.9%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#991B1B', fontWeight: 600 }}>● Needs Attention:</span>
                      <span style={{ fontWeight: 700 }}>&lt; 60.0%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--bg)'
            }}>
              <button
                onClick={() => setShowRulesModal(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Got it, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiPage;
