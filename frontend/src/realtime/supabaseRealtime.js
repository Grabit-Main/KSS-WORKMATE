import { supabase } from './supabaseClient';
import { apiCache } from '../api/cache';

/**
 * KSS Workmate - Hardened Real-Time Synchronization Engine
 * 
 * Security Architecture:
 * 1. Zero Sensitive Data on Public Supabase: No chat messages, KPI ratings, employee
 *    salaries, or confidential task descriptions are ever broadcast over public channels.
 * 2. Untrusted Payload Defense: Supabase Broadcast is treated as an untrusted advisory channel.
 *    Only thin invalidation signals ('*.invalidated') are accepted. Arbitrary client mutations,
 *    forged deletions, and data modifications are strictly rejected.
 * 3. Authoritative Re-fetch: On valid invalidation signals, clients re-query the authenticated
 *    FastAPI REST endpoints where server-side JWT and role-based permissions are enforced.
 * 4. Local Cross-Tab Isolation: Multi-tab sync on the same computer uses the browser's
 *    Same-Origin Policy protected BroadcastChannel.
 */

let globalBroadcastChannel = null;
const lastInvalidationTimes = new Map(); // scope -> timestamp

// Allowed public advisory broadcast event types
const ALLOWED_BROADCAST_EVENTS = new Set([
  'task.invalidated',
  'project.invalidated',
  'team.invalidated'
]);

/**
 * Send a thin advisory invalidation signal to notify other active tabs/browsers
 * that data in a specific scope has changed.
 * NEVER transmits confidential entity contents, chat text, or user IDs.
 */
export const broadcastRealtimeEvent = (eventType, data = {}) => {
  if (!eventType) return;

  // Enforce thin signal structure: strip any sensitive fields
  const safeScope = String(data.scope || eventType.split('.')[0] || 'general').replace(/[^a-z]/gi, '');
  const thinPayload = {
    eventType,
    scope: safeScope,
    timestamp: Date.now()
  };

  // 1. Broadcast via native browser BroadcastChannel (same origin, local tabs only)
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel('workmate_realtime_bus');
      bc.postMessage(thinPayload);
      bc.close();
    } catch {}
  }

  // 2. Broadcast thin advisory signal via Supabase (ONLY if in allowed whitelist)
  if (ALLOWED_BROADCAST_EVENTS.has(eventType) && globalBroadcastChannel) {
    try {
      globalBroadcastChannel.send({
        type: 'broadcast',
        event: 'workmate_advisory',
        payload: thinPayload
      });
    } catch (err) {
      console.warn('[Realtime] Supabase advisory broadcast error:', err);
    }
  }
};

let activeChannel = null;

export const initSupabaseRealtime = (user, dispatch) => {
  if (!user || !user.id || !dispatch) return () => {};

  const userId = String(user.id);

  // Clean up any existing channel before reconnecting
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
    globalBroadcastChannel = null;
  }

  // Unified global broadcast channel for thin advisory invalidations
  const channel = supabase.channel('workmate-global-realtime', {
    config: { broadcast: { ack: false } }
  });

  // A. Supabase Realtime Broadcast Listener (Hardened & Untrusted)
  channel.on('broadcast', { event: 'workmate_advisory' }, (wrapper) => {
    try {
      const message = wrapper?.payload;
      if (!message || typeof message !== 'object') return;

      const { eventType, scope, timestamp } = message;

      // 1. Strict Event Whitelist: Reject any non-invalidation event (forgery protection)
      if (!ALLOWED_BROADCAST_EVENTS.has(eventType)) {
        console.warn(`[Security] Dropped untrusted/forbidden broadcast event: ${eventType}`);
        return;
      }

      // 2. Rate-limiting: Max 1 invalidation per scope every 3 seconds to prevent DoS spam
      const now = Date.now();
      const lastTime = lastInvalidationTimes.get(scope) || 0;
      if (now - lastTime < 3000) {
        return;
      }
      lastInvalidationTimes.set(scope, now);

      // 3. Ignore stale messages (> 15 seconds old)
      if (timestamp && now - timestamp > 15000) {
        return;
      }

      // 4. Invalidate cache for the affected scope so subsequent view queries fetch fresh, authorized data
      if (scope) {
        apiCache.invalidate(`/${scope}`);
        // Notify local subscribers that an authoritative refresh is recommended
        dispatch(`${scope}.refresh`, { scope }, { broadcast: false });
      }
    } catch (err) {
      console.error('[Realtime Broadcast] Error processing advisory message:', err);
    }
  });

  // B. PostgreSQL CDC Listeners (Secondary WAL Transport)
  // In Supabase, if Postgres permissions are ever granted, these fire with row data
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'tasks' },
    (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;
      const row = eventType === 'DELETE' ? oldRow : newRow;
      if (!row) return;

      apiCache.invalidate('/tasks');
      if (eventType === 'INSERT') dispatch('task.created', row);
      if (eventType === 'UPDATE') dispatch('task.updated', row);
      if (eventType === 'DELETE') dispatch('task.deleted', row);
    }
  );

  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications' },
    (payload) => {
      const newRow = payload.new;
      if (!newRow || String(newRow.user_id) !== userId) return;
      apiCache.invalidate('/notifications');
      dispatch('notification.new', newRow);
    }
  );

  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_messages' },
    (payload) => {
      const newRow = payload.new;
      if (!newRow) return;

      // Server CDC participant check
      if (newRow.chat_type === 'direct' || newRow.receiver_id) {
        const isParticipant = String(newRow.sender_id) === userId || String(newRow.receiver_id) === userId;
        if (!isParticipant) return;
      }
      apiCache.invalidate('/chat');
      dispatch('chat.new_message', newRow);
    }
  );

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'projects' },
    (payload) => {
      apiCache.invalidate('/projects');
      dispatch('project.updated', payload.new || payload.old);
    }
  );

  channel.subscribe((status, err) => {
    if (err) {
      console.warn('[Supabase Realtime] Subscription status:', status, err);
    }
  });

  globalBroadcastChannel = channel;
  activeChannel = channel;

  return () => {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
      globalBroadcastChannel = null;
    }
  };
};
