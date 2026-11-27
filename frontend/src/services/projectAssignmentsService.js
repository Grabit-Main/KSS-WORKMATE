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

export const getAllAssignedProjectsForEmployee = (empId, empEmail = '', apiProjects = [], tasks = []) => {
  const idStr = empId ? String(empId) : '';
  const emailStr = empEmail ? String(empEmail).toLowerCase() : '';

  // 1. Projects from Backend API
  const apiMatches = (apiProjects || []).filter(p => {
    if (!p) return false;
    const membersArr = Array.isArray(p.members) ? p.members : [];
    const hasMember = membersArr.some(m => m && (String(m.id || m.user_id) === idStr || (m.email && m.email.toLowerCase() === emailStr)));
    const hasLead = String(p.lead_id || p.lead?.id || '') === idStr;
    const hasTask = (tasks || []).some(t => t && String(t.assigned_to || t.assignee?.id) === idStr && String(t.project_id) === String(p.id));
    return hasMember || hasLead || hasTask;
  }).map(p => ({
    ...p,
    id: String(p.id),
    name: p.name || p.title || 'Untitled Project',
    role: p.role || (String(p.lead_id || p.lead?.id || '') === idStr ? 'Project Lead' : 'Contributor'),
    status: p.status || 'Active',
    progress: p.progress !== undefined ? Number(p.progress) : (String(p.status).toLowerCase() === 'completed' ? 100 : 70),
    start_date: p.start_date || p.startDate || p.created_at || null,
    due_date: p.due_date || p.dueDate || p.target_completion_date || p.deadline || null,
    isManual: false
  }));

  // 2. Manual Projects assigned by TL
  const manualMatches = getManualAssignmentsForEmployee(idStr, emailStr).map(p => ({
    ...p,
    id: String(p.id),
    isManual: true
  }));

  // Combine and deduplicate (manual projects override or supplement)
  const combinedMap = new Map();
  apiMatches.forEach(p => combinedMap.set(p.name.toLowerCase().trim(), p));
  manualMatches.forEach(p => combinedMap.set(p.name.toLowerCase().trim(), p));

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
