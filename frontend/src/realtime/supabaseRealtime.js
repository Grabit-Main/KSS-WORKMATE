import { supabase } from './supabaseClient';

/**
 * Supabase Realtime PostgreSQL Database Synchronizer
 * Subscribes to PostgreSQL INSERT, UPDATE, and DELETE database changes on:
 * - tasks
 * - notifications
 * - chat_messages
 * - projects
 * - teams
 * - daily_kpi_logs
 *
 * Filters payloads according to authorization & user roles and dispatches to React state.
 */

let activeChannel = null;

export const initSupabaseRealtime = (user, dispatch) => {
  if (!user || !user.id || !dispatch) return () => {};

  // Clean up any existing channel before reconnecting
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  const userId = String(user.id);
  const userRole = user.role;
  const isExec = ['CEO', 'CTO', 'PM'].includes(userRole);

  const channel = supabase.channel(`public-realtime-${userId}`);

  // 1. Tasks Table (INSERT, UPDATE, DELETE)
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'tasks' },
    (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      const row = eventType === 'DELETE' ? oldRow : newRow;
      if (!row) return;

      // Role-based filtering: Executive (CEO/CTO/PM), TL, or assigned member/creator
      const isAssignedTo = String(row.assigned_to) === userId;
      const isAssignedBy = String(row.assigned_by) === userId;
      const isAuthorized = isExec || isAssignedTo || isAssignedBy || userRole === 'TL';

      if (!isAuthorized) return;

      console.log(`[Realtime] Event: ${eventType} | Table: tasks | Record ID: ${row.id}`);

      if (eventType === 'INSERT') {
        dispatch('task.created', row);
      } else if (eventType === 'UPDATE') {
        dispatch('task.updated', row);
        if (row.status) dispatch('task.status_changed', row);
        if (row.assigned_to) dispatch('task.reassigned', row);
        if (row.is_locked !== undefined) dispatch('task.locked', row);
      } else if (eventType === 'DELETE') {
        dispatch('task.deleted', row);
      }
    }
  );

  // 2. Notifications Table (INSERT)
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications' },
    (payload) => {
      const newRow = payload.new;
      if (!newRow) return;

      // Notification RLS Check: Only notify recipient user
      if (String(newRow.user_id) === userId) {
        console.log(`[Realtime] Event: INSERT | Table: notifications | Record ID: ${newRow.id}`);
        dispatch('notification.new', newRow);
        if (newRow.event_type) {
          dispatch(newRow.event_type, {
            id: newRow.ref_id,
            task_id: newRow.ref_id,
            ref_id: newRow.ref_id
          });
        }
      }
    }
  );

  // 3. Chat Messages Table (INSERT)
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_messages' },
    (payload) => {
      const newRow = payload.new;
      if (!newRow) return;

      console.log(`[Realtime] Event: INSERT | Table: chat_messages | Record ID: ${newRow.id}`);
      dispatch('chat.new_message', newRow);
    }
  );

  // 4. Projects Table (INSERT, UPDATE, DELETE)
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'projects' },
    (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      const row = eventType === 'DELETE' ? oldRow : newRow;
      if (!row) return;

      console.log(`[Realtime] Event: ${eventType} | Table: projects | Record ID: ${row.id}`);
      if (eventType === 'INSERT') dispatch('project.created', row);
      if (eventType === 'UPDATE') dispatch('project.updated', row);
      if (eventType === 'DELETE') dispatch('project.deleted', row);
    }
  );

  // 5. Teams Table (INSERT, UPDATE, DELETE)
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'teams' },
    (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      const row = eventType === 'DELETE' ? oldRow : newRow;
      if (!row) return;

      console.log(`[Realtime] Event: ${eventType} | Table: teams | Record ID: ${row.id}`);
      if (eventType === 'INSERT') dispatch('team.created', row);
      if (eventType === 'UPDATE') dispatch('team.updated', row);
      if (eventType === 'DELETE') dispatch('team.deleted', row);
    }
  );

  // 6. Daily KPI Logs Table (INSERT, UPDATE)
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'daily_kpi_logs' },
    (payload) => {
      const newRow = payload.new;
      if (!newRow) return;

      console.log(`[Realtime] Event: ${payload.eventType} | Table: daily_kpi_logs | Record ID: ${newRow.id}`);
      dispatch('kpi.logged', newRow);
    }
  );

  // Subscribe channel and log channel status
  channel.subscribe((status, err) => {
    console.log('[Realtime] Status:', status);
    if (err) {
      console.warn('[Realtime] Error:', err);
    }
  });

  activeChannel = channel;

  // Cleanup handler
  return () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
};
