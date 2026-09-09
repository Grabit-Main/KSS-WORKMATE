/**
 * Apple-Grade Date & Timing Utilities
 * Accurately parses UTC timestamps without timezone drift,
 * and formats dates, times, and countdowns cleanly in the user's local timezone.
 */

// Parse any datetime input (naive ISO, UTC, Date) into a valid Date object
export const parseUTC = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const clean = val.trim();
    if (!clean) return null;

    // If it's pure date (YYYY-MM-DD or DD-MM-YYYY), parse without time drift
    const ddmmyyyy = clean.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      const d = new Date(+ddmmyyyy[3], +ddmmyyyy[2] - 1, +ddmmyyyy[1]);
      return isNaN(d.getTime()) ? null : d;
    }

    const yyyymmdd = clean.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (yyyymmdd) {
      const d = new Date(+yyyymmdd[1], +yyyymmdd[2] - 1, +yyyymmdd[3]);
      return isNaN(d.getTime()) ? null : d;
    }

    // If it's an ISO timestamp from Python/Postgres without trailing Z or offset, append Z
    // e.g. "2026-09-09T05:45:00" -> "2026-09-09T05:45:00Z"
    let iso = clean;
    if (iso.includes('T') && !iso.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(iso)) {
      iso = `${iso}Z`;
    }

    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

// Format to DD-MM-YYYY (e.g. "09-09-2026")
export const formatDate = (val) => {
  const d = parseUTC(val);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Format to 12-hour time (e.g. "11:24 AM")
export const formatTime = (val) => {
  const d = parseUTC(val);
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Format to DD-MM-YYYY at hh:mm AM/PM
export const formatDateTime = (val) => {
  const d = parseUTC(val);
  if (!d) return '';
  const datePart = formatDate(d);
  const timePart = formatTime(d);
  return `${datePart} at ${timePart}`;
};

// Apple-style intelligent relative time
export const formatRelativeTime = (val) => {
  const d = parseUTC(val);
  if (!d) return 'Recent';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return `Yesterday at ${formatTime(d)}`;
  }

  if (diffSec < 86400 * 7) {
    const days = Math.floor(diffSec / 86400);
    return `${days}d ago`;
  }

  return formatDateTime(d);
};

// Normalize any date representation into standard DD-MM-YYYY string
export const normalizeToDDMMYYYY = (val) => {
  if (!val) return '';
  if (typeof val !== 'string') {
    const d = parseUTC(val);
    return d ? formatDate(d) : '';
  }
  const clean = val.trim();
  const ddmmyyyy = clean.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[1]}-${ddmmyyyy[2]}-${ddmmyyyy[3]}`;
  }
  const yyyymmdd = clean.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (yyyymmdd) {
    return `${yyyymmdd[3]}-${yyyymmdd[2]}-${yyyymmdd[1]}`;
  }
  const d = parseUTC(clean);
  return d ? formatDate(d) : clean;
};

// Check if a deadline is overdue
export const isOverdue = (deadline) => {
  const d = parseUTC(deadline);
  if (!d) return false;
  return d.getTime() < Date.now();
};

// Detailed deadline status badge helper
export const getDeadlineStatus = (deadline) => {
  const d = parseUTC(deadline);
  if (!d) return { isOverdue: false, text: '', color: 'var(--text-secondary)' };

  const now = Date.now();
  const diffMs = d.getTime() - now;
  const overdue = diffMs < 0;
  const absDiffSec = Math.floor(Math.abs(diffMs) / 1000);

  if (overdue) {
    if (absDiffSec < 3600) {
      return { isOverdue: true, text: `Overdue by ${Math.floor(absDiffSec / 60)}m`, color: 'var(--status-blocked)' };
    }
    if (absDiffSec < 86400) {
      return { isOverdue: true, text: `Overdue by ${Math.floor(absDiffSec / 3600)}h`, color: 'var(--status-blocked)' };
    }
    return { isOverdue: true, text: `Overdue by ${Math.floor(absDiffSec / 86400)}d`, color: 'var(--status-blocked)' };
  } else {
    if (absDiffSec < 3600) {
      return { isOverdue: false, text: `Due in ${Math.floor(absDiffSec / 60)}m`, color: 'var(--status-in-progress)' };
    }
    if (absDiffSec < 86400) {
      return { isOverdue: false, text: `Due in ${Math.floor(absDiffSec / 3600)}h`, color: 'var(--brand-600)' };
    }
    const days = Math.floor(absDiffSec / 86400);
    return { isOverdue: false, text: `Due in ${days}d`, color: 'var(--text-secondary)' };
  }
};
