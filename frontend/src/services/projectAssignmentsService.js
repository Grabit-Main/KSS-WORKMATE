/**
 * Single source of truth for Developer Project Assignments.
 * Synchronizes across:
 * 1. Employee Profile > Projects Tab (Assigned Projects table)
 * 2. Team Directory > Employee Cards (Projects count)
 * 3. Team Directory > Developer Pop-up Modal (Company Projects list)
 */

const STORAGE_KEY = 'workmate_manual_project_assignments';

const getStoredAssignments = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Failed to read project assignments from localStorage:', err);
    return {};
  }
};

const saveStoredAssignments = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save project assignments to localStorage:', err);
  }
};

export const getManualAssignmentsForEmployee = (empId, empEmail = '') => {
  const store = getStoredAssignments();
  const idKey = empId ? String(empId) : '';
  const emailKey = empEmail ? String(empEmail).toLowerCase() : '';

  const listById = idKey && Array.isArray(store[idKey]) ? store[idKey] : [];
  const listByEmail = emailKey && Array.isArray(store[emailKey]) ? store[emailKey] : [];

  // Merge unique by project ID
  const map = new Map();
  listById.forEach(p => map.set(String(p.id), p));
  listByEmail.forEach(p => map.set(String(p.id), p));
  return Array.from(map.values());
};

export const getAllAssignedProjectsForEmployee = (empId, empEmail = '', apiProjects = [], tasks = [], employee = null) => {
  const idStr = empId ? String(empId) : '';
  const emailStr = empEmail ? String(empEmail).toLowerCase() : '';

  // Get any cached API projects from localStorage if apiProjects is empty
  let effectiveApiProjects = Array.isArray(apiProjects) ? [...apiProjects] : [];
  if (effectiveApiProjects.length === 0 && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('cache_projects');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          effectiveApiProjects = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached projects:', e);
    }
  }

  // Helper: check if a project specifically matches this employee
  const hasSpecificMatch = (p) => {
    if (!p) return false;
    // 1. Direct members
    if (Array.isArray(p.members) && p.members.some(m => String(m.id || m.user_id) === idStr || (m.email && m.email.toLowerCase() === emailStr))) return true;
    if (Array.isArray(p.users) && p.users.some(u => String(u.id) === idStr || (u.email && u.email.toLowerCase() === emailStr))) return true;
    
    // 2. Teams allocated to this project
    if (Array.isArray(p.teams) && p.teams.some(team => {
      const mems = Array.isArray(team.memberships) ? team.memberships : (Array.isArray(team.members) ? team.members : []);
      return mems.some(m => String(m?.user_id || m?.user?.id || m?.id) === idStr || (m?.user?.email && m.user.email.toLowerCase() === emailStr));
    })) return true;

    // 3. Lead or Creator
    if (String(p.lead_id || p.lead?.id || '') === idStr) return true;
    if (String(p.created_by || '') === idStr && (employee?.role === 'PM' || employee?.role === 'TL')) return true;

    // 4. Tasks assigned to this employee in this project
    if ((tasks || []).some(t => t && String(t.assigned_to || t.assignee?.id) === idStr && String(t.project_id) === String(p.id))) return true;

    // 5. Department / Squad match
    const empDept = (employee?.department || employee?.role || '').toLowerCase();
    if (empDept && Array.isArray(p.teams) && p.teams.some(t => {
      const tName = (t.name || '').toLowerCase();
      return tName.includes(empDept) || empDept.includes(tName);
    })) return true;

    return false;
  };

  // If specific matches exist for this employee, use them.
  // Otherwise, real projects created in the Project section represent Company Projects for the employee
  // (so real projects created by PM / Management in the Project section appear in the developer popup box).
  const matchedProjects = effectiveApiProjects.filter(p => hasSpecificMatch(p));
  const finalApiProjects = matchedProjects.length > 0 ? matchedProjects : effectiveApiProjects;

  // Format real projects created in the project section
  const apiMatches = finalApiProjects.filter(Boolean).map(p => {
    let role = p.role || '';
    if (!role) {
      if (String(p.lead_id || p.lead?.id || '') === idStr) {
        role = 'Project Lead';
      } else if (Array.isArray(p.teams)) {
        for (const t of p.teams) {
          const mems = Array.isArray(t.memberships) ? t.memberships : (Array.isArray(t.members) ? t.members : []);
          const foundMem = mems.find(m => String(m?.user_id || m?.user?.id || m?.id) === idStr || (m?.user?.email && m.user.email.toLowerCase() === emailStr));
          if (foundMem) {
            role = foundMem.is_lead ? 'Team Lead' : (foundMem.role || '');
            break;
          }
        }
      }
    }
    if (!role) {
      const empRole = employee?.role || '';
      const empDept = employee?.department || '';
      if (empRole === 'PM') role = 'Project Manager';
      else if (empRole === 'TL') role = 'Technical Lead';
      else if (empDept && empDept !== 'Management') role = empDept;
      else role = employee?.role || 'Contributor';
    }

    const rawStatus = String(p.status || 'Active').trim();
    let normalizedStatus = 'Active';
    const sLow = rawStatus.toLowerCase();
    if (sLow.includes('complete') || sLow === 'done') normalizedStatus = 'Completed';
    else if (sLow.includes('progress') || sLow === 'active') normalizedStatus = 'In Progress';
    else if (sLow.includes('hold') || sLow.includes('block')) normalizedStatus = 'On Hold';
    else if (sLow.includes('review')) normalizedStatus = 'Review';

    let progress = 0;
    const projectTasks = (tasks || []).filter(t => t && String(t.project_id) === String(p.id));
    if (p.progress !== undefined && p.progress !== null && !isNaN(Number(p.progress))) {
      progress = Number(p.progress);
    } else if (projectTasks.length > 0) {
      const completedCount = projectTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
      progress = Math.round((completedCount / projectTasks.length) * 100);
    } else {
      progress = normalizedStatus === 'Completed' ? 100 : (normalizedStatus === 'In Progress' ? 65 : 40);
    }

    return {
      ...p,
      id: String(p.id),
      name: p.name || p.title || 'Untitled Project',
      role: role,
      status: normalizedStatus,
      progress: Math.max(0, Math.min(100, isNaN(progress) ? 65 : progress)),
      start_date: p.start_date || p.startDate || p.created_at || null,
      due_date: p.due_date || p.dueDate || p.target_completion_date || p.deadline || null,
      aim: p.aim || '',
      isManual: false
    };
  });

  // 2. Manual Projects assigned by TL
  const manualMatches = getManualAssignmentsForEmployee(idStr, emailStr).map(p => ({
    ...p,
    id: String(p.id),
    isManual: true
  }));

  // Combine and deduplicate by project name
  const combinedMap = new Map();
  apiMatches.forEach(p => {
    const key = (p.name || '').toLowerCase().trim();
    if (key) combinedMap.set(key, p);
  });
  manualMatches.forEach(p => {
    const key = (p.name || '').toLowerCase().trim();
    if (key) combinedMap.set(key, p);
  });

  return Array.from(combinedMap.values());
};

export const addProjectAssignment = (empId, empEmail, projectData, currentUser) => {
  const userRole = String(currentUser?.role || '').trim().toUpperCase();
  if (userRole !== 'TL') {
    const error = new Error('403 Forbidden: Only Team Leads (TL) can assign projects to developers.');
    error.status = 403;
    throw error;
  }

  // Input validation
  const name = String(projectData.name || '').trim();
  const role = String(projectData.role || '').trim();
  const status = String(projectData.status || 'Active').trim();
  const progress = Math.max(0, Math.min(100, Number(projectData.progress) || 0));
  const startDate = projectData.start_date || null;
  const dueDate = projectData.due_date || null;

  if (!name) {
    throw new Error('Project Name is required.');
  }
  if (!role) {
    throw new Error('Role on project is required.');
  }
  if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
    throw new Error('Due Date cannot be before Start Date.');
  }

  const newProject = {
    id: `manual_proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name,
    role,
    status,
    progress,
    start_date: startDate,
    due_date: dueDate,
    assigned_by: `${currentUser.first_name || 'Team'} ${currentUser.last_name || 'Lead'}`.trim() || currentUser.email,
    assigned_by_id: String(currentUser.id || ''),
    assigned_to: empId ? String(empId) : '',
    assigned_to_email: empEmail ? String(empEmail).toLowerCase() : '',
    created_at: new Date().toISOString()
  };

  const store = getStoredAssignments();
  const primaryKey = empId ? String(empId) : (empEmail ? String(empEmail).toLowerCase() : 'global');
  if (!Array.isArray(store[primaryKey])) {
    store[primaryKey] = [];
  }
  store[primaryKey].push(newProject);

  // If both empId and email exist, keep secondary key synced
  if (empEmail && String(empEmail).toLowerCase() !== primaryKey) {
    const emailKey = String(empEmail).toLowerCase();
    if (!Array.isArray(store[emailKey])) store[emailKey] = [];
    store[emailKey].push(newProject);
  }

  saveStoredAssignments(store);

  // Broadcast event for real-time synchronization across Directory Cards & Developer Pop-up
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workmate_projects_updated', {
      detail: { empId, empEmail, action: 'add', project: newProject }
    }));
  }

  return newProject;
};

export const updateProjectAssignment = (empId, empEmail, projectId, updateData, currentUser) => {
  const userRole = String(currentUser?.role || '').trim().toUpperCase();
  if (userRole !== 'TL') {
    const error = new Error('403 Forbidden: Only Team Leads (TL) can update project assignments.');
    error.status = 403;
    throw error;
  }

  const name = String(updateData.name || '').trim();
  const role = String(updateData.role || '').trim();
  const status = String(updateData.status || 'Active').trim();
  const progress = Math.max(0, Math.min(100, Number(updateData.progress) || 0));
  const startDate = updateData.start_date || null;
  const dueDate = updateData.due_date || null;

  if (!name) {
    throw new Error('Project Name is required.');
  }
  if (!role) {
    throw new Error('Role on project is required.');
  }
  if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
    throw new Error('Due Date cannot be before Start Date.');
  }

  const store = getStoredAssignments();
  let updatedProject = null;

  Object.keys(store).forEach(key => {
    if (Array.isArray(store[key])) {
      store[key] = store[key].map(p => {
        if (String(p.id) === String(projectId)) {
          updatedProject = {
            ...p,
            name,
            role,
            status,
            progress,
            start_date: startDate,
            due_date: dueDate,
            updated_at: new Date().toISOString()
          };
          return updatedProject;
        }
        return p;
      });
    }
  });

  saveStoredAssignments(store);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workmate_projects_updated', {
      detail: { empId, empEmail, action: 'update', project: updatedProject }
    }));
  }

  return updatedProject;
};

export const deleteProjectAssignment = (empId, empEmail, projectId, currentUser) => {
  const userRole = String(currentUser?.role || '').trim().toUpperCase();
  if (userRole !== 'TL') {
    const error = new Error('403 Forbidden: Only Team Leads (TL) can remove project assignments.');
    error.status = 403;
    throw error;
  }

  const store = getStoredAssignments();
  Object.keys(store).forEach(key => {
    if (Array.isArray(store[key])) {
      store[key] = store[key].filter(p => String(p.id) !== String(projectId));
    }
  });

  saveStoredAssignments(store);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workmate_projects_updated', {
      detail: { empId, empEmail, action: 'delete', projectId }
    }));
  }

  return true;
};
