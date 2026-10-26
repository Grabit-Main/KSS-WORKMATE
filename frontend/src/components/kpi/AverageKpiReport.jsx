import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Activity,
  RotateCcw
} from 'lucide-react';
import { CRITERIA } from '../../pages/KpiPage';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const formatDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseDateStr = (str) => {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const d = parseDateStr(dateStr);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

const formatRangeLabel = (startStr, endStr) => {
  if (!startStr && !endStr) return 'All Dates';
  if (startStr && !endStr) return `From ${formatDisplayDate(startStr)}`;
  if (!startStr && endStr) return `Until ${formatDisplayDate(endStr)}`;
  const s = parseDateStr(startStr);
  const e = parseDateStr(endStr);
  if (s.getFullYear() === e.getFullYear()) {
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} - ${e.getDate()} ${MONTH_SHORT[s.getMonth()]} ${s.getFullYear()}`;
    }
    return `${s.getDate()} ${MONTH_SHORT[s.getMonth()]} - ${e.getDate()} ${MONTH_SHORT[e.getMonth()]} ${s.getFullYear()}`;
  }
  return `${formatDisplayDate(startStr)} - ${formatDisplayDate(endStr)}`;
};

export const AverageKpiReport = ({ logs = [], teammates = [], onClose }) => {
  // Extract all available evaluation dates from logs
  const availableDates = useMemo(() => {
    const dates = new Set();
    logs.forEach((l) => {
      if (l.date) dates.add(String(l.date).split('T')[0]);
    });
    return Array.from(dates).sort();
  }, [logs]);

  // Default range spans earliest log date to latest log date (or today)
  const defaultRange = useMemo(() => {
    if (availableDates.length === 0) {
      const todayStr = formatDateStr(new Date());
      return { start: todayStr, end: todayStr };
    }
    return {
      start: availableDates[0],
      end: availableDates[availableDates.length - 1],
    };
  }, [availableDates]);

  const [periodType, setPeriodType] = useState('till_today'); // 'week' | 'month' | 'year' | 'till_today' | 'custom'
  const [appliedRange, setAppliedRange] = useState(defaultRange);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Picker calendar state
  const [pickerBaseMonth, setPickerBaseMonth] = useState(() => {
    if (defaultRange.start) {
      const d = parseDateStr(defaultRange.start);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tempStart, setTempStart] = useState(defaultRange.start);
  const [tempEnd, setTempEnd] = useState(defaultRange.end);

  // Period Preset handlers
  const handleSelectPeriod = (type) => {
    setPeriodType(type);
    setIsPickerOpen(false);

    const now = new Date();
    const todayStr = formatDateStr(now);

    if (type === 'week') {
      const day = now.getDay();
      const diffToMon = (day + 6) % 7;
      const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMon);
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
      const startStr = formatDateStr(mon);
      const endStr = formatDateStr(sun) > todayStr ? todayStr : formatDateStr(sun);
      setAppliedRange({ start: startStr, end: endStr });
      setTempStart(startStr);
      setTempEnd(endStr);
    } else if (type === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const startStr = formatDateStr(firstDay);
      setAppliedRange({ start: startStr, end: todayStr });
      setTempStart(startStr);
      setTempEnd(todayStr);
    } else if (type === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const startStr = formatDateStr(firstDay);
      setAppliedRange({ start: startStr, end: todayStr });
      setTempStart(startStr);
      setTempEnd(todayStr);
    } else if (type === 'till_today') {
      setAppliedRange(defaultRange);
      setTempStart(defaultRange.start);
      setTempEnd(defaultRange.end);
    } else if (type === 'custom') {
      setIsPickerOpen(true);
    }
  };

  const handleReset = () => {
    setPeriodType('till_today');
    setAppliedRange(defaultRange);
    setTempStart(defaultRange.start);
    setTempEnd(defaultRange.end);
    setIsPickerOpen(false);
  };

  // Calendar click handler
  const handleDateClick = (dateStr) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd('');
    } else if (tempStart && !tempEnd) {
      if (dateStr < tempStart) {
        setTempStart(dateStr);
        setTempEnd('');
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  const handleApplyRange = () => {
    if (tempStart && tempEnd) {
      setAppliedRange({ start: tempStart, end: tempEnd });
      setPeriodType('custom');
      setIsPickerOpen(false);
    } else if (tempStart) {
      setAppliedRange({ start: tempStart, end: tempStart });
      setPeriodType('custom');
      setIsPickerOpen(false);
    }
  };

  const handleCancelPicker = () => {
    setTempStart(appliedRange.start);
    setTempEnd(appliedRange.end);
    setIsPickerOpen(false);
  };

  // Filter logs strictly within applied range and exclude upper management roles from TM ranking
  const filteredLogs = useMemo(() => {
    const { start, end } = appliedRange;
    return logs.filter((l) => {
      if (!l.date) return false;
      const d = String(l.date).split('T')[0];
      if (start && d < start) return false;
      if (end && d > end) return false;
      const role = (l.employee?.role || '').toUpperCase();
      if (['CEO', 'CTO', 'TL', 'PM', 'CO'].includes(role)) return false;
      return true;
    });
  }, [logs, appliedRange]);

  // Unique dates in the filtered range
  const uniqueDatesInRange = useMemo(() => {
    const set = new Set();
    filteredLogs.forEach((l) => {
      if (l.date) set.add(String(l.date).split('T')[0]);
    });
    return Array.from(set).sort();
  }, [filteredLogs]);

  // Employee rankings and metrics calculation
  const { employeeRankings, teamAverageKpi, totalEntries, monthlyBreakdown, statusTotals, criteriaTeamAverages } = useMemo(() => {
    const empMap = new Map();

    filteredLogs.forEach((l) => {
      const eid = l.employee_id || l.employee?.id;
      if (!eid) return;
      const key = String(eid);
      if (!empMap.has(key)) {
        empMap.set(key, {
          id: key,
          employee: l.employee,
          logs: [],
        });
      }
      empMap.get(key).logs.push(l);
    });

    const midIndex = Math.floor(uniqueDatesInRange.length / 2);
    const earlyDates = new Set(uniqueDatesInRange.slice(0, midIndex));
    const lateDates = new Set(uniqueDatesInRange.slice(midIndex));

    const maxDateStr = uniqueDatesInRange.length > 0 ? uniqueDatesInRange[uniqueDatesInRange.length - 1] : '';
    let last7CutoffStr = '';
    if (maxDateStr) {
      const maxD = parseDateStr(maxDateStr);
      const cutD = new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate() - 6);
      last7CutoffStr = formatDateStr(cutD);
    }

    const criteriaKeys = [
      'task_completion', 'quality', 'productivity', 'deadline_adherence',
      'ownership', 'problem_solving', 'communication', 'team_collaboration',
      'learning_improvement', 'attendance_discipline'
    ];

    let totalScoreSum = 0;
    let totalLogsCount = 0;
    const statusCounts = { 'Very Good': 0, 'Meets Expectation': 0, 'Excellent': 0, 'Needs Improvement': 0, 'Needs Attention': 0 };
    const monthScores = {};

    filteredLogs.forEach((l) => {
      totalScoreSum += Number(l.daily_kpi_percentage || 0);
      totalLogsCount += 1;
      const st = l.status;
      if (statusCounts[st] !== undefined) statusCounts[st] += 1;

      // Group by Month (e.g. "Sep", "Oct")
      if (l.date) {
        const d = parseDateStr(String(l.date).split('T')[0]);
        const mKey = MONTH_NAMES[d.getMonth()];
        if (!monthScores[mKey]) monthScores[mKey] = [];
        monthScores[mKey].push(Number(l.daily_kpi_percentage || 0));
      }
    });

    const rankings = Array.from(empMap.values()).map((item) => {
      const elogs = item.logs;
      const count = elogs.length;
      const avgKpi = count > 0 ? elogs.reduce((a, b) => a + Number(b.daily_kpi_percentage || 0), 0) / count : 0;
      const pcts = elogs.map((l) => Number(l.daily_kpi_percentage || 0));
      const minKpi = pcts.length > 0 ? Math.min(...pcts) : 0;
      const maxKpi = pcts.length > 0 ? Math.max(...pcts) : 0;

      const earlyLogs = elogs.filter((l) => earlyDates.has(String(l.date).split('T')[0]));
      const lateLogs = elogs.filter((l) => lateDates.has(String(l.date).split('T')[0]));
      const last7Logs = elogs.filter((l) => String(l.date).split('T')[0] >= last7CutoffStr);

      const earlyAvg = earlyLogs.length > 0 ? earlyLogs.reduce((a, b) => a + Number(b.daily_kpi_percentage || 0), 0) / earlyLogs.length : null;
      const lateAvg = lateLogs.length > 0 ? lateLogs.reduce((a, b) => a + Number(b.daily_kpi_percentage || 0), 0) / lateLogs.length : null;
      const last7Avg = last7Logs.length > 0 ? last7Logs.reduce((a, b) => a + Number(b.daily_kpi_percentage || 0), 0) / last7Logs.length : null;

      // Criteria averages
      const criteriaAvg = {};
      criteriaKeys.forEach((key) => {
        const sum = elogs.reduce((a, b) => a + Number(b[key] || 0), 0);
        criteriaAvg[key] = count > 0 ? sum / count : 0;
      });

      // Status counts for this employee
      const empStatus = {
        Excellent: elogs.filter((l) => l.status === 'Excellent' || Number(l.daily_kpi_percentage) >= 95).length,
        VeryGood: elogs.filter((l) => l.status === 'Very Good' || (Number(l.daily_kpi_percentage) >= 80 && Number(l.daily_kpi_percentage) < 95)).length,
        MeetsExp: elogs.filter((l) => l.status === 'Meets Expectation' || (Number(l.daily_kpi_percentage) >= 65 && Number(l.daily_kpi_percentage) < 80)).length,
      };

      return {
        id: item.id,
        employee: item.employee,
        name: `${item.employee?.first_name || ''} ${item.employee?.last_name || ''}`.trim() || 'Employee',
        avgKpi,
        minKpi,
        maxKpi,
        range: `${Math.round(minKpi)}-${Math.round(maxKpi)}`,
        earlyAvg,
        lateAvg,
        last7Avg,
        days: count,
        criteriaAvg,
        empStatus,
      };
    });

    // Sort descending by Avg KPI
    rankings.sort((a, b) => b.avgKpi - a.avgKpi);

    const teamAvg = totalLogsCount > 0 ? totalScoreSum / totalLogsCount : 0;

    // Team averages for each criterion
    const teamCriteria = {};
    criteriaKeys.forEach((key) => {
      const sum = filteredLogs.reduce((a, b) => a + Number(b[key] || 0), 0);
      teamCriteria[key] = totalLogsCount > 0 ? sum / totalLogsCount : 0;
    });

    return {
      employeeRankings: rankings,
      teamAverageKpi: teamAvg,
      totalEntries: totalLogsCount,
      monthlyBreakdown: monthScores,
      statusTotals: statusCounts,
      criteriaTeamAverages: teamCriteria,
    };
  }, [filteredLogs, uniqueDatesInRange]);

  // Dynamic overview narrative text
  const overviewText = useMemo(() => {
    if (totalEntries === 0) {
      return 'No KPI evaluation entries found for the selected period.';
    }

    const monthNames = Object.keys(monthlyBreakdown);
    let trendPart = '';
    if (monthNames.length >= 2) {
      const m1 = monthNames[0];
      const m2 = monthNames[monthNames.length - 1];
      const avg1 = (monthlyBreakdown[m1].reduce((a, b) => a + b, 0) / monthlyBreakdown[m1].length).toFixed(1);
      const avg2 = (monthlyBreakdown[m2].reduce((a, b) => a + b, 0) / monthlyBreakdown[m2].length).toFixed(1);
      const dir = Number(avg2) >= Number(avg1) ? 'up' : 'down';
      trendPart = `, ${dir} from ${avg1}% in ${m1} to ${avg2}% in ${m2}`;
    }

    const vg = statusTotals['Very Good'] || 0;
    const me = statusTotals['Meets Expectation'] || 0;
    const exc = statusTotals['Excellent'] || 0;

    let gapPart = '';
    if (employeeRankings.length > 1) {
      const top = employeeRankings[0].avgKpi;
      const bot = employeeRankings[employeeRankings.length - 1].avgKpi;
      const gap = (top - bot).toFixed(1);
      gapPart = ` The gap between first and last place is ${gap} points.`;
    }

    return `Team average KPI is ${teamAverageKpi.toFixed(1)}%${trendPart}. Of ${totalEntries} entries, ${vg} rated Very Good, ${me} Meets Expectation and ${exc} Excellent.${gapPart}`;
  }, [totalEntries, teamAverageKpi, monthlyBreakdown, statusTotals, employeeRankings]);

  // Color helper for KPI %
  const getKpiColor = (pct) => {
    if (pct >= 85) return '#059669'; // Green
    if (pct >= 80) return '#D97706'; // Amber/Orange
    return '#DC2626'; // Red
  };

  // Calendar month rendering helper
  const renderCalendarMonth = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const todayStr = formatDateStr(new Date());

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(dStr);
    }

    return (
      <div style={{ flex: 1, minWidth: '220px' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B', textAlign: 'center', marginBottom: '10px' }}>
          {MONTH_NAMES[month]} {year}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', fontSize: '11px', color: '#64748B', marginBottom: '6px' }}>
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} style={{ padding: '2px 0', fontWeight: 600 }}>{day}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {days.map((dateStr, idx) => {
            if (!dateStr) {
              return <div key={`empty-${idx}`} style={{ height: '28px' }} />;
            }

            const isStart = tempStart === dateStr;
            const isEnd = tempEnd === dateStr;
            const isInRange = tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd;
            const isSelected = isStart || isEnd;
            const isFuture = dateStr > todayStr;

            return (
              <button
                key={dateStr}
                type="button"
                disabled={isFuture}
                onClick={() => handleDateClick(dateStr)}
                style={{
                  height: '28px',
                  width: '100%',
                  border: 'none',
                  borderRadius: isSelected ? '50%' : isInRange ? '0' : '4px',
                  background: isSelected
                    ? '#2563EB'
                    : isInRange
                    ? '#EFF6FF'
                    : 'transparent',
                  color: isSelected
                    ? '#FFFFFF'
                    : isFuture
                    ? '#CBD5E1'
                    : '#1E293B',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '11.5px',
                  cursor: isFuture ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'background 0.15s ease'
                }}
              >
                {Number(dateStr.split('-')[2])}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const nextMonthDate = useMemo(() => {
    return new Date(pickerBaseMonth.getFullYear(), pickerBaseMonth.getMonth() + 1, 1);
  }, [pickerBaseMonth]);

  const handlePrevMonth = () => {
    setPickerBaseMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setPickerBaseMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>

      {/* Period Selection & Date Range Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px',
        position: 'relative'
      }}>
        {/* Left Segmented Pill Controls */}
        <div style={{
          display: 'inline-flex',
          background: '#F1F5F9',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px'
        }}>
          {[
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'year', label: 'Year' },
            { key: 'till_today', label: 'Till Today' },
            { key: 'custom', label: 'Custom Date Range' }
          ].map((tab) => {
            const isActive = periodType === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleSelectPeriod(tab.key)}
                style={{
                  border: 'none',
                  padding: '7px 18px',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#2563EB' : '#64748B',
                  boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Date Range Display & Reset Button */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsPickerOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: isPickerOpen ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#1E293B',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <Calendar size={15} style={{ color: '#2563EB' }} />
            <span>{formatRangeLabel(appliedRange.start, appliedRange.end)}</span>
            {isPickerOpen ? <ChevronUp size={14} style={{ color: '#64748B' }} /> : <ChevronDown size={14} style={{ color: '#64748B' }} />}
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset to default range"
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#64748B',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>

        {/* Custom Date Range 2-Month Calendar Dropdown */}
        {isPickerOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 100,
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)',
            padding: '20px',
            width: '520px',
            maxWidth: '95vw'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                Select Evaluation Period
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {renderCalendarMonth(pickerBaseMonth)}
              {renderCalendarMonth(nextMonthDate)}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '18px',
              paddingTop: '14px',
              borderTop: '1px solid #E2E8F0'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Selected Range:</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                  {formatRangeLabel(tempStart, tempEnd)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCancelPicker}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#64748B',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyRange}
                  disabled={!tempStart}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: !tempStart ? 'not-allowed' : 'pointer',
                    opacity: !tempStart ? 0.6 : 1,
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card 1: Employee KPI Summary & Ranking */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <BarChart3 size={22} color="#2563EB" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Employee KPI Summary & Ranking
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
              Source: Daily_KPI_Log_{appliedRange.end || 'all'}.csv | Period: {formatRangeLabel(appliedRange.start, appliedRange.end)} | {employeeRankings.length} employees, {totalEntries} entries, {uniqueDatesInRange.length} working days
            </p>
          </div>
        </div>

        {/* Overview Narrative */}
        <div style={{
          background: '#F8FAFC',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #E2E8F0',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
            Overview
          </h3>
          <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.6 }}>
            {overviewText}
          </p>
        </div>

        {/* Ranking by average daily KPI Table */}
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px 0' }}>
          Ranking by average daily KPI
        </h3>
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#0F172A', color: '#FFFFFF' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, width: '48px' }}>#</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Employee</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Avg KPI</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Range</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Early</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Late</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Last 7d</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Days</th>
              </tr>
            </thead>
            <tbody>
              {employeeRankings.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    No evaluations logged in the selected period.
                  </td>
                </tr>
              ) : (
                employeeRankings.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#EFF6FF')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#64748B' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#EEF2FF',
                          color: '#4F46E5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '11px',
                          overflow: 'hidden'
                        }}>
                          {emp.employee?.avatar_url ? (
                            <img src={emp.employee.avatar_url} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
                          )}
                        </div>
                        <span style={{ fontWeight: 600, color: '#1E293B' }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: getKpiColor(emp.avgKpi) }}>
                      {emp.avgKpi.toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                      {emp.range}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#334155' }}>
                      {emp.earlyAvg !== null ? `${emp.earlyAvg.toFixed(1)}` : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#334155' }}>
                      {emp.lateAvg !== null ? `${emp.lateAvg.toFixed(1)}` : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#334155' }}>
                      {emp.last7Avg !== null ? `${emp.last7Avg.toFixed(1)}` : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#334155', fontWeight: 600 }}>
                      {emp.days}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 2: Average KPI at a glance (Horizontal Bar Chart) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BarChart3 size={20} color="#2563EB" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Average KPI at a glance
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {employeeRankings.map((emp) => {
            // Scale starts at 60% as stated in screenshot note
            const widthPct = Math.max(8, Math.min(100, ((emp.avgKpi - 60) / 40) * 100));
            const barColor = getKpiColor(emp.avgKpi);

            return (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '180px', flexShrink: 0, fontSize: '13px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {emp.name}
                </div>
                <div style={{ flex: 1, background: '#F1F5F9', height: '24px', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: '4px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <div style={{ width: '65px', flexShrink: 0, fontWeight: 800, fontSize: '13px', color: '#0F172A', textAlign: 'left' }}>
                  {emp.avgKpi.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '16px', marginBottom: 0, fontStyle: 'italic' }}>
          Bar scale starts at 60% to make differences visible.
        </p>
      </div>

      {/* Card 3: Average score by parameter (1-5) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <LayoutGrid size={20} color="#2563EB" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Average score by parameter (1-5)
          </h3>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#0F172A', color: '#FFFFFF' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'left', minWidth: '160px' }}>Employee</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Task</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Qual.</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Prod.</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Dead.</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Own.</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Prob.</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Comm.</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Team</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Learn</th>
                <th style={{ padding: '12px 10px', fontWeight: 700 }}>Attend</th>
              </tr>
            </thead>
            <tbody>
              {employeeRankings.map((emp, idx) => {
                const keys = [
                  'task_completion', 'quality', 'productivity', 'deadline_adherence',
                  'ownership', 'problem_solving', 'communication', 'team_collaboration',
                  'learning_improvement', 'attendance_discipline'
                ];

                return (
                  <tr
                    key={emp.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF'
                    }}
                  >
                    <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#1E293B' }}>
                      {emp.name}
                    </td>
                    {keys.map((k) => {
                      const score = emp.criteriaAvg[k] || 0;
                      // Heatmap logic matching screenshot:
                      // Green = 4.6 or above; orange = below 3.95
                      let bg = 'transparent';
                      let color = '#1E293B';
                      let weight = 500;
                      if (score >= 4.6) {
                        bg = '#D1FAE5';
                        color = '#065F46';
                        weight = 700;
                      } else if (score <= 3.95) {
                        bg = '#FFEDD5';
                        color = '#9A3412';
                        weight = 700;
                      }

                      return (
                        <td
                          key={k}
                          style={{
                            padding: '12px 10px',
                            background: bg,
                            color,
                            fontWeight: weight
                          }}
                        >
                          {score.toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Team Average Row */}
              <tr style={{ background: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 800 }}>
                <td style={{ padding: '14px 16px', textAlign: 'left', color: '#0F172A', fontWeight: 800 }}>
                  Team average
                </td>
                {[
                  'task_completion', 'quality', 'productivity', 'deadline_adherence',
                  'ownership', 'problem_solving', 'communication', 'team_collaboration',
                  'learning_improvement', 'attendance_discipline'
                ].map((k) => {
                  const score = criteriaTeamAverages[k] || 0;
                  return (
                    <td key={k} style={{ padding: '14px 10px', color: '#0F172A', fontWeight: 800 }}>
                      {score.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '12px', color: '#64748B', marginTop: '14px', marginBottom: 0 }}>
          Green = 4.6 or above; orange = below 3.95. Columns: Task completion, Quality, Productivity, Deadline adherence, Ownership, Problem solving, Communication, Team collaboration, Learning/Improvement, Attendance & discipline.
        </p>
      </div>

      {/* Card 4: Status distribution (days) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <LayoutGrid size={20} color="#2563EB" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Status distribution (days)
          </h3>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#0F172A', color: '#FFFFFF' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'left', minWidth: '180px' }}>Employee</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Excellent</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Very Good</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Meets Exp.</th>
              </tr>
            </thead>
            <tbody>
              {employeeRankings.map((emp, idx) => (
                <tr
                  key={emp.id}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    background: idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#EFF6FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF')}
                >
                  <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#1E293B' }}>
                    {emp.name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155', fontWeight: emp.empStatus.Excellent > 0 ? 700 : 500 }}>
                    {emp.empStatus.Excellent}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155', fontWeight: emp.empStatus.VeryGood > 0 ? 700 : 500 }}>
                    {emp.empStatus.VeryGood}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155', fontWeight: emp.empStatus.MeetsExp > 0 ? 700 : 500 }}>
                    {emp.empStatus.MeetsExp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AverageKpiReport;
