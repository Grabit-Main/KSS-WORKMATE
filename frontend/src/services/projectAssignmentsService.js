/**
 * Single source of truth for Team Directory Project Assignments.
 * Stores manually assigned projects in the dedicated backend database table `team_directory_projects`.
 * Synchronizes across:
 * 1. Employee Profile > Projects Tab (Assigned Projects table)
 * 2. Team Directory > Employee Cards (Projects count)
 * 3. Team Directory > Developer Pop-up Modal (Company Projects list)
 */

import {
  getTeamDirectoryProjects,
  createTeamDirectoryProject,
  updateTeamDirectoryProject,
  deleteTeamDirectoryProject
} from '../api/teamDirectoryProjects';

const STORAGE_KEY = 'workmate_team_directory_projects';

let inMemoryProjects = null;

export const loadBackendProjects = async () => {
  try {
    const data = await getTeamDirectoryProjects();
    if (Array.isArray(data)) {
      inMemoryProjects = data;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.warn('Could not fetch team directory projects from backend:', err);
  }
  return getStoredProjects();
};

const getStoredProjects = () => {
  if (inMemoryProjects && Array.isArray(inMemoryProjects)) {
    return inMemoryProjects;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          inMemoryProjects = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to read team directory projects from localStorage:', err);
    }
  }
  return [];
};

const saveStoredProjects = (list) => {
  inMemoryProjects = Array.isArray(list) ? list : [];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryProjects));
    } catch (err) {
      console.error('Failed to save team directory projects to localStorage:', err);
    }
  }
};

export const getManualAssignmentsForEmployee = (empId, empEmail = '', empName = '') => {
  const allProjects = getStoredProjects();
  const idKey = empId ? String(empId).trim() : '';
  const emailKey = empEmail ? String(empEmail).trim().toLowerCase() : '';
  const nameKey = empName ? String(empName).trim().toLowerCase() : '';

  if (!idKey && !emailKey && !nameKey) return [];

  const matched = new Map();

  allProjects.forEach(p => {
    if (!p) return;
    const pDevId = String(p.developer_id || p.assigned_to || '').trim();
    const pEmail = String(p.developer_email || p.assigned_to_email || '').trim().toLowerCase();
    const pName = String(p.developer_name || p.assigned_to_name || '').trim().toLowerCase();

    const matchId = idKey && pDevId && (pDevId === idKey || idKey.includes(pDevId) || pDevId.includes(idKey));
    const matchEmail = emailKey && pEmail && pEmail === emailKey;
    const matchName = nameKey && pName && (
      pName === nameKey ||
      (pName.length > 2 && nameKey.includes(pName)) ||
      (nameKey.length > 2 && pName.includes(nameKey))
    );

    if (matchId || matchEmail || matchName) {
      matched.set(String(p.id || p.name), p);
    }
  });

  return Array.from(matched.values());
};

export const getAllAssignedProjectsForEmployee = (empId, empEmail = '', employee = null, empName = '') => {
  const idStr = empId ? String(empId).trim() : '';
  const emailStr = empEmail ? String(empEmail).trim().toLowerCase() : '';
  const nameStr = empName ? String(empName).trim().toLowerCase() : (
    employee?.full_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || employee?.name || ''
  ).toLowerCase();

  // Strictly return only manual projects created by the TL in the team_directory_projects table
  const manualList = getManualAssignmentsForEmployee(idStr, emailStr, nameStr);

  return manualList.map(p => ({
    ...p,
    id: String(p.id),
    name: p.name || 'Untitled Project',
    role: p.role || 'Contributor',
    status: p.status || 'Active',
    progress: Math.max(0, Math.min(100, Number(p.progress) || 0)),
    start_date: p.start_date || null,
    due_date: p.due_date || null,
    isManual: true
  }));
};

export const addProjectAssignment = async (empId, empEmail, projectData, currentUser, empName = '') => {
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
  const startDate = projectData.start_date ? new Date(projectData.start_date).toISOString() : null;
  const dueDate = projectData.due_date ? new Date(projectData.due_date).toISOString() : null;

  if (!name) {
    throw new Error('Project Name is required.');
  }
  if (!role) {
    throw new Error('Role on project is required.');
  }
  if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
    throw new Error('Due Date cannot be before Start Date.');
  }

  const payload = {
    developer_id: String(empId || '').trim(),
    developer_email: empEmail ? String(empEmail).trim().toLowerCase() : null,
    developer_name: empName ? String(empName).trim() : null,
    name,
    role,
    status,
    progress,
    start_date: startDate,
    due_date: dueDate
  };

  let createdProject = null;
  try {
    createdProject = await createTeamDirectoryProject(payload);
  } catch (apiErr) {
    console.warn('Backend API save failed, creating local fallback project:', apiErr);
    createdProject = {
      id: `manual_proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...payload,
      assigned_by_name: `${currentUser?.first_name || 'Team'} ${currentUser?.last_name || 'Lead'}`.trim() || currentUser?.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  const currentList = getStoredProjects();
  saveStoredProjects([createdProject, ...currentList]);

  // Broadcast event for real-time synchronization across Directory Cards & Developer Pop-up
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workmate_projects_updated', {
      detail: { empId, empEmail, empName, action: 'add', project: createdProject }
    }));
  }

  return createdProject;
};

export const updateProjectAssignment = async (empId, empEmail, projectId, updateData, currentUser, empName = '') => {
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
  const startDate = updateData.start_date ? new Date(updateData.start_date).toISOString() : null;
  const dueDate = updateData.due_date ? new Date(updateData.due_date).toISOString() : null;

  if (!name) {
    throw new Error('Project Name is required.');
  }
  if (!role) {
    throw new Error('Role on project is required.');
  }
  if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
    throw new Error('Due Date cannot be before Start Date.');
  }

  const payload = {
    name,
    role,
    status,
    progress,
    start_date: startDate,
    due_date: dueDate
  };

  let updatedProject = null;
  try {
    updatedProject = await updateTeamDirectoryProject(projectId, payload);
  } catch (apiErr) {
    console.warn('Backend API update failed, updating locally:', apiErr);
  }

  const currentList = getStoredProjects().map(p => {
    if (String(p.id) === String(projectId)) {
      updatedProject = {
        ...p,
        ...payload,
        updated_at: new Date().toISOString()
      };
      return updatedProject;
    }
    return p;
  });

  saveStoredProjects(currentList);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workmate_projects_updated', {
      detail: { empId, empEmail, empName, action: 'update', project: updatedProject }
    }));
  }

  return updatedProject;
};

export const deleteProjectAssignment = async (empId, empEmail, projectId, currentUser) => {
  const userRole = String(currentUser?.role || '').trim().toUpperCase();
  const isTL = !currentUser || userRole === 'TL' || userRole.includes('LEAD') || userRole === 'ADMIN';
  if (!isTL) {
    const error = new Error('403 Forbidden: Only Team Leads (TL) can remove project assignments.');
    error.status = 403;
    throw error;
  }

  try {
    await deleteTeamDirectoryProject(projectId);
  } catch (apiErr) {
    console.warn('Backend API delete failed, deleting locally:', apiErr);
  }

  const currentList = getStoredProjects().filter(p => String(p.id) !== String(projectId));
  saveStoredProjects(currentList);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workmate_projects_updated', {
      detail: { empId, empEmail, action: 'delete', projectId }
    }));
  }

  return true;
};
