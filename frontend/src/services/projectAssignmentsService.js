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

export const getManualAssignmentsForEmployee = (empId, empEmail = '', empName = '') => {
  const store = getStoredAssignments();
  const idKey = empId ? String(empId).trim() : '';
  const emailKey = empEmail ? String(empEmail).trim().toLowerCase() : '';
  const nameKey = empName ? String(empName).trim().toLowerCase() : '';

  const matched = new Map();

  // 1. Check direct keys
  if (idKey && Array.isArray(store[idKey])) {
    store[idKey].forEach(p => p && matched.set(String(p.id || p.name), p));
  }
  if (emailKey && Array.isArray(store[emailKey])) {
    store[emailKey].forEach(p => p && matched.set(String(p.id || p.name), p));
  }
  if (nameKey && Array.isArray(store[nameKey])) {
    store[nameKey].forEach(p => p && matched.set(String(p.id || p.name), p));
  }

  // 2. Scan ALL projects across the entire store to match by assigned_to, assigned_to_email, assigned_to_name
  Object.values(store).forEach(arr => {
    if (Array.isArray(arr)) {
      arr.forEach(p => {
        if (!p) return;
        const pAssignedTo = String(p.assigned_to || '').trim();
        const pEmail = String(p.assigned_to_email || '').trim().toLowerCase();
        const pName = String(p.assigned_to_name || '').trim().toLowerCase();

        const matchId = idKey && pAssignedTo && (pAssignedTo === idKey);
        const matchEmail = emailKey && pEmail && (pEmail === emailKey);
        const matchName = nameKey && pName && (
          pName === nameKey ||
          (pName.length > 2 && nameKey.includes(pName)) ||
          (nameKey.length > 2 && pName.includes(nameKey))
        );

        if (matchId || matchEmail || matchName) {
          matched.set(String(p.id || p.name), p);
        }
      });
    }
  });

  return Array.from(matched.values());
};

export const getAllAssignedProjectsForEmployee = (empId, empEmail = '', apiProjects = [], tasks = [], employee = null, empName = '') => {
  const idStr = empId ? String(empId).trim() : '';
  const emailStr = empEmail ? String(empEmail).trim().toLowerCase() : '';
  const nameStr = empName ? String(empName).trim().toLowerCase() : (employee?.full_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || employee?.name || '').toLowerCase();

  const combined = new Map();

  // A. Strictly return projects manually assigned by the TL to this specific employee
  const manualMatches = getManualAssignmentsForEmployee(idStr, emailStr, nameStr);
  manualMatches.forEach(p => {
    if (p) combined.set(String(p.name || p.id).toLowerCase().trim(), {
      ...p,
      id: String(p.id),
      name: p.name || 'Untitled Project',
      role: p.role || 'Contributor',
      status: p.status || 'Active',
      progress: Math.max(0, Math.min(100, Number(p.progress) || 0)),
      start_date: p.start_date || null,
      due_date: p.due_date || null,
      isManual: true
    });
  });

  // B. Also check if the project was assigned to this employee via backend API, team allocation, or tasks
  if (Array.isArray(apiProjects) && apiProjects.length > 0) {
    apiProjects.forEach(p => {
      if (!p) return;

      // 1) Direct member in p.members, p.users, or p.assignees
      const isDirectMember = (Array.isArray(p.members) && p.members.some(m => String(m.id || m.user_id) === idStr || (m.email && m.email.toLowerCase() === emailStr))) ||
        (Array.isArray(p.users) && p.users.some(u => String(u.id) === idStr || (u.email && u.email.toLowerCase() === emailStr)));

      // 2) Tasks assigned to this employee for this project
      const hasAssignedTask = Array.isArray(tasks) && tasks.some(t => t && String(t.assigned_to || t.assignee?.id) === idStr && String(t.project_id) === String(p.id));

      // 3) Team membership in project teams (e.g. Team Designers for Mahesh and Ritish)
      const inProjectTeam = Array.isArray(p.teams) && p.teams.some(team => {
        const mems = Array.isArray(team.memberships) ? team.memberships : (Array.isArray(team.members) ? team.members : []);
        return mems.some(m => {
          const mId = String(m?.user_id || m?.user?.id || m?.id || '').trim();
          const mEmail = String(m?.user?.email || m?.email || '').trim().toLowerCase();
          const mName = String(m?.user?.full_name || `${m?.user?.first_name || ''} ${m?.user?.last_name || ''}` || m?.name || '').trim().toLowerCase();
          return (idStr && mId === idStr) || (emailStr && mEmail === emailStr) || (nameStr && mName && (mName === nameStr || nameStr.includes(mName) || mName.includes(nameStr)));
        });
      });

      // 4) Lead of project
      const isLead = String(p.lead_id || p.lead?.id || '') === idStr;

      if (isDirectMember || hasAssignedTask || inProjectTeam || isLead) {
        const pKey = String(p.name || p.id).toLowerCase().trim();
        if (!combined.has(pKey)) {
          let role = p.role || '';
          if (!role) {
            if (isLead) role = 'Project Lead';
            else if (inProjectTeam) role = employee?.department || employee?.role || 'Contributor';
            else role = employee?.role || 'Contributor';
          }
          const rawStatus = String(p.status || 'Active').trim();
          let normalizedStatus = 'Active';
          const sLow = rawStatus.toLowerCase();
          if (sLow.includes('complete') || sLow === 'done') normalizedStatus = 'Completed';
          else if (sLow.includes('progress') || sLow === 'active') normalizedStatus = 'In Progress';
          else if (sLow.includes('hold') || sLow.includes('block')) normalizedStatus = 'On Hold';
          else if (sLow.includes('review')) normalizedStatus = 'Review';

          combined.set(pKey, {
            ...p,
            id: String(p.id),
            name: p.name || 'Untitled Project',
            role: role,
            status: normalizedStatus,
            progress: p.progress !== undefined ? Number(p.progress) : (normalizedStatus === 'Completed' ? 100 : 70),
            start_date: p.start_date || p.startDate || p.created_at || null,
            due_date: p.due_date || p.dueDate || p.deadline || null,
            isManual: false
          });
        }
      }
    });
  }

  return Array.from(combined.values());
};

export const addProjectAssignment = (empId, empEmail, projectData, currentUser, empName = '') => {
  const userRole = String(currentUser?.role || '').trim().toUpperCase();
  const isTL = !currentUser || userRole === 'TL' || userRole.includes('LEAD') || userRole === 'ADMIN';
  if (!isTL) {
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

  const assignedByName = currentUser ? (`${currentUser.first_name || 'Team'} ${currentUser.last_name || 'Lead'}`.trim() || currentUser.email) : 'Team Lead';

  const newProject = {
    id: `manual_proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name,
    role,
    status,
    progress,
    start_date: startDate,
    due_date: dueDate,
    assigned_by: assignedByName,
    assigned_by_id: String(currentUser?.id || ''),
    assigned_to: empId ? String(empId).trim() : '',
    assigned_to_email: empEmail ? String(empEmail).trim().toLowerCase() : '',
    assigned_to_name: empName ? String(empName).trim() : '',
    created_at: new Date().toISOString()
  };

  const store = getStoredAssignments();
  const idKey = empId ? String(empId).trim() : '';
  const emailKey = empEmail ? String(empEmail).trim().toLowerCase() : '';
  const nameKey = empName ? String(empName).trim().toLowerCase() : '';

  if (idKey) {
    if (!Array.isArray(store[idKey])) store[idKey] = [];
    store[idKey].push(newProject);
  }
  if (emailKey && emailKey !== idKey) {
    if (!Array.isArray(store[emailKey])) store[emailKey] = [];
    store[emailKey].push(newProject);
  }
  if (nameKey && nameKey !== idKey && nameKey !== emailKey) {
    if (!Array.isArray(store[nameKey])) store[nameKey] = [];
    store[nameKey].push(newProject);
  }

  saveStoredAssignments(store);

  // Broadcast event for real-time synchronization across Directory Cards & Developer Pop-up
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workmate_projects_updated', {
      detail: { empId, empEmail, empName, action: 'add', project: newProject }
    }));
  }

  return newProject;
};

export const updateProjectAssignment = (empId, empEmail, projectId, updateData, currentUser, empName = '') => {
  const userRole = String(currentUser?.role || '').trim().toUpperCase();
  const isTL = !currentUser || userRole === 'TL' || userRole.includes('LEAD') || userRole === 'ADMIN';
  if (!isTL) {
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
