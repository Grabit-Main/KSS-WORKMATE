/**
 * KSS Workmate - JARVIS Brain & Reasoning Service
 * Generates deterministic, accurate, role-specific spoken announcements based on real application data.
 * Zero external AI API costs, zero hallucination, 100% data integrity.
 */

/**
 * Get time-of-day greeting (Good morning / afternoon / evening)
 */
export const getTimeOfDayGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Format user display name (First name or full name)
 */
export const getUserDisplayName = (user) => {
  if (!user) return 'there';
  if (user.first_name) return user.first_name.trim();
  return (user.email ? user.email.split('@')[0] : 'there');
};

/**
 * Normalize role to standard Workmate role categories:
 * 'CEO' | 'CTO' | 'PM' | 'TL' | 'TM' (Developer)
 */
export const normalizeRole = (role) => {
  if (!role) return 'TM';
  const upper = String(role).toUpperCase();
  if (upper === 'CEO') return 'CEO';
  if (upper === 'CTO') return 'CTO';
  if (upper === 'PM' || upper.includes('PROJECT MANAGER')) return 'PM';
  if (upper === 'TL' || upper.includes('LEAD') || upper.includes('TEAM LEAD')) return 'TL';
  return 'TM'; // Developer / Team Member
};

/**
 * Filter tasks assigned specifically to the user (or company-wide for leadership)
 */
export const analyzeTasks = (tasks = [], user = null) => {
  const currentUserId = user ? String(user.id) : null;
  const role = normalizeRole(user?.role);
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();

  // If TM (Developer), strictly examine tasks assigned to them
  const relevantTasks = (role === 'TM' && currentUserId)
    ? tasks.filter(t => String(t.assigned_to) === currentUserId)
    : tasks;

  let total = relevantTasks.length;
  let inProgress = 0;
  let pending = 0;
  let completed = 0;
  let awaitingReview = 0;
  let dueToday = [];
  let overdue = [];
  let urgent = [];

  relevantTasks.forEach(task => {
    const status = (task.status || '').toLowerCase();
    const isCompleted = ['completed', 'confirmed'].includes(status);

    if (isCompleted) {
      completed++;
    } else {
      if (['in_progress', 'started'].includes(status)) {
        inProgress++;
      } else if (['pending', 'accepted'].includes(status)) {
        pending++;
      } else if (status === 'awaiting_review' || status === 'under_review') {
        awaitingReview++;
      }

      // Check priority
      const priority = (task.priority || '').toLowerCase();
      if (['urgent', 'high'].includes(priority)) {
        urgent.push(task);
      }

      // Check deadline / scheduled date
      let isOverdue = Boolean(task.deadline_exceeded);
      let isDueToday = false;

      if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        if (!isNaN(deadlineDate.getTime())) {
          const deadlineDateStr = deadlineDate.toISOString().split('T')[0];
          if (deadlineDateStr === todayStr) {
            isDueToday = true;
          } else if (deadlineDate < now) {
            isOverdue = true;
          }
        }
      }

      if (task.scheduled_date) {
        if (task.scheduled_date.includes(todayStr) || todayStr.includes(task.scheduled_date)) {
          isDueToday = true;
        }
      }

      if (isDueToday) {
        dueToday.push(task);
      }
      if (isOverdue && !isDueToday) {
        overdue.push(task);
      }
    }
  });

  // Find top priority pending or in-progress task
  const activeTasks = relevantTasks.filter(t => !['completed', 'confirmed'].includes((t.status || '').toLowerCase()));
  activeTasks.sort((a, b) => {
    const weight = { urgent: 4, high: 3, normal: 2, low: 1 };
    const wa = weight[(a.priority || '').toLowerCase()] || 2;
    const wb = weight[(b.priority || '').toLowerCase()] || 2;
    return wb - wa;
  });

  const topTask = activeTasks[0] || null;

  return {
    total,
    activeCount: activeTasks.length,
    inProgress,
    pending,
    completed,
    awaitingReview,
    dueToday,
    overdue,
    urgent,
    topTask
  };
};

/**
 * Generate full greeting speech text
 */
export const generateGreetingSpeech = ({
  user,
  isFirstTime = false,
  tasks = [],
  projects = []
}) => {
  const timeGreeting = getTimeOfDayGreeting();
  const name = getUserDisplayName(user);
  const role = normalizeRole(user?.role);
  const stats = analyzeTasks(tasks, user);

  let introPart = '';
  if (isFirstTime) {
    introPart = `${timeGreeting}, ${name}! I am JARVIS, your personal AI assistant in Workmate. I am here to help you stay updated with your responsibilities, tasks, and deadlines.`;
  } else {
    introPart = `Welcome back, ${name}! JARVIS is ready to assist you. Let me give you a quick update on your work.`;
  }

  // Generate role-specific work intelligence summary
  const roleSummary = generateRoleSpecificSummary(user, stats, projects);

  return `${introPart} ${roleSummary}`.trim();
};

/**
 * Role-Specific Work Intelligence Summary
 */
export const generateRoleSpecificSummary = (user, stats, projects = []) => {
  const role = normalizeRole(user?.role);
  const name = getUserDisplayName(user);

  switch (role) {
    case 'TM': { // Developer
      if (stats.total === 0) {
        return `You currently have no tasks assigned. You are all caught up!`;
      }

      let parts = [];
      parts.push(`You currently have ${stats.total} assigned task${stats.total > 1 ? 's' : ''}, with ${stats.activeCount} active.`);

      if (stats.dueToday.length > 0) {
        parts.push(`${stats.dueToday.length === 1 ? 'One task is' : `${stats.dueToday.length} tasks are`} due today.`);
      }
      if (stats.overdue.length > 0) {
        parts.push(`${stats.overdue.length === 1 ? 'One task is' : `${stats.overdue.length} tasks are`} overdue.`);
      }

      if (stats.topTask) {
        parts.push(`Your highest-priority active task is: "${stats.topTask.title}".`);
      } else if (stats.completed > 0) {
        parts.push(`Great job! You have completed ${stats.completed} task${stats.completed > 1 ? 's' : ''}.`);
      }

      return parts.join(' ');
    }

    case 'TL': { // Team Lead
      let parts = [];
      parts.push(`Your team currently has ${stats.total} total task${stats.total > 1 ? 's' : ''}, with ${stats.activeCount} in progress.`);

      if (stats.awaitingReview > 0) {
        parts.push(`${stats.awaitingReview} task${stats.awaitingReview > 1 ? 's are' : ' is'} awaiting your review.`);
      }
      if (stats.dueToday.length > 0) {
        parts.push(`${stats.dueToday.length} team task${stats.dueToday.length > 1 ? 's require' : ' requires'} attention today.`);
      }
      if (stats.overdue.length > 0) {
        parts.push(`${stats.overdue.length} team task${stats.overdue.length > 1 ? 's are' : ' is'} overdue.`);
      }

      return parts.join(' ');
    }

    case 'PM': { // Project Manager
      const activeProjects = projects.filter(p => !['completed', 'archived'].includes((p.status || '').toLowerCase()));
      let parts = [];
      parts.push(`You have ${activeProjects.length} active project${activeProjects.length !== 1 ? 's' : ''} across the workspace.`);

      if (stats.activeCount > 0) {
        parts.push(`There are ${stats.activeCount} active deliverable tasks being tracked.`);
      }
      if (stats.overdue.length > 0) {
        parts.push(`${stats.overdue.length} task${stats.overdue.length > 1 ? 's are' : ' is'} past their project deadline.`);
      }
      if (stats.dueToday.length > 0) {
        parts.push(`${stats.dueToday.length} task${stats.dueToday.length > 1 ? 's have' : ' has'} milestones due today.`);
      }

      return parts.join(' ');
    }

    case 'CTO': {
      let parts = [];
      parts.push(`Technical project operations are steady.`);
      if (projects.length > 0) {
        parts.push(`Tracking ${projects.length} engineering project initiatives.`);
      }
      if (stats.urgent.length > 0) {
        parts.push(`There ${stats.urgent.length === 1 ? 'is 1 high-priority task' : `are ${stats.urgent.length} high-priority tasks`} requiring technical oversight.`);
      }
      if (stats.overdue.length > 0) {
        parts.push(`${stats.overdue.length} task${stats.overdue.length > 1 ? 's have' : ' has'} exceeded deadlines.`);
      } else {
        parts.push(`No critical blockers are currently reported.`);
      }
      return parts.join(' ');
    }

    case 'CEO': {
      let parts = [];
      const activeProjCount = projects.filter(p => !['completed', 'archived'].includes((p.status || '').toLowerCase())).length;
      parts.push(`Company operations summary: ${activeProjCount} active project${activeProjCount !== 1 ? 's' : ''} underway.`);
      if (stats.total > 0) {
        const rate = Math.round((stats.completed / stats.total) * 100);
        parts.push(`Overall team completion rate stands at ${rate} percent.`);
      }
      if (stats.overdue.length > 0) {
        parts.push(`${stats.overdue.length} overdue item${stats.overdue.length > 1 ? 's require' : ' requires'} attention.`);
      } else {
        parts.push(`Deliverables are proceeding on schedule.`);
      }
      return parts.join(' ');
    }

    default:
      return `You have ${stats.activeCount} active tasks in your workspace.`;
  }
};

/**
 * "Read my task summary" Action
 */
export const generateTaskSummaryAction = (tasks = [], user = null) => {
  const stats = analyzeTasks(tasks, user);
  if (stats.total === 0) {
    return `You have zero assigned tasks at the moment. Your board is clear!`;
  }
  let text = `Here is your task summary: You have ${stats.total} total task${stats.total > 1 ? 's' : ''}. `;
  text += `${stats.completed} completed, ${stats.inProgress} in progress, and ${stats.pending} pending. `;
  if (stats.dueToday.length > 0) {
    text += `${stats.dueToday.length} task${stats.dueToday.length > 1 ? 's are' : ' is'} due today. `;
  }
  if (stats.overdue.length > 0) {
    text += `Warning: ${stats.overdue.length} task${stats.overdue.length > 1 ? 's are' : ' is'} overdue. `;
  }
  return text.trim();
};

/**
 * "What is due today?" Action
 */
export const generateDueTodayAction = (tasks = [], user = null) => {
  const stats = analyzeTasks(tasks, user);
  if (stats.dueToday.length === 0) {
    return `Good news! You have no tasks due today.`;
  }
  const taskTitles = stats.dueToday.slice(0, 3).map(t => `"${t.title}"`).join(', ');
  const remaining = stats.dueToday.length > 3 ? ` and ${stats.dueToday.length - 3} more` : '';
  return `You have ${stats.dueToday.length} task${stats.dueToday.length > 1 ? 's' : ''} due today: ${taskTitles}${remaining}. Please make sure to review their progress.`;
};

/**
 * "What tasks are overdue?" Action
 */
export const generateOverdueAction = (tasks = [], user = null) => {
  const stats = analyzeTasks(tasks, user);
  if (stats.overdue.length === 0) {
    return `Excellent! You do not have any overdue tasks. All deadlines are on track.`;
  }
  const taskTitles = stats.overdue.slice(0, 3).map(t => `"${t.title}"`).join(', ');
  const remaining = stats.overdue.length > 3 ? ` and ${stats.overdue.length - 3} others` : '';
  return `Attention required: You have ${stats.overdue.length} overdue task${stats.overdue.length > 1 ? 's' : ''}: ${taskTitles}${remaining}. Please attend to them as soon as possible.`;
};

/**
 * "What should I focus on today?" Action
 */
export const generateFocusRecommendationAction = (tasks = [], user = null) => {
  const stats = analyzeTasks(tasks, user);
  if (stats.overdue.length > 0) {
    const overdueTask = stats.overdue[0];
    return `Your top priority today should be the overdue task: "${overdueTask.title}". It requires immediate completion.`;
  }
  if (stats.dueToday.length > 0) {
    const dueTask = stats.dueToday[0];
    return `You should focus on "${dueTask.title}", which has a deadline today.`;
  }
  if (stats.topTask) {
    return `Based on priority, I recommend focusing on "${stats.topTask.title}", currently marked as ${stats.topTask.priority} priority.`;
  }
  return `You have no urgent tasks pending. You may use this time to plan upcoming goals or explore training materials.`;
};

/**
 * "Give me my work progress" Action
 */
export const generateWorkProgressAction = (tasks = [], projects = [], user = null) => {
  const stats = analyzeTasks(tasks, user);
  if (stats.total === 0) {
    return `No task progress data is available yet because you have not been assigned tasks.`;
  }
  const rate = Math.round((stats.completed / stats.total) * 100);
  return `Your overall task completion rate is ${rate} percent. You have completed ${stats.completed} out of ${stats.total} total assigned deliverables, with ${stats.activeCount} currently active.`;
};

/**
 * Smart Deadline Reminder Announcement
 */
export const generateDeadlineReminder = (task, user = null) => {
  const name = getUserDisplayName(user);
  const title = task?.title || 'your task';
  return `${name}, this is a reminder from JARVIS. Your task "${title}" has a deadline approaching today. Please review your progress.`;
};

