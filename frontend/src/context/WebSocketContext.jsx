import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getNotifications } from '../api/notifications';
import { apiCache } from '../api/cache';
import { initSupabaseRealtime, broadcastRealtimeEvent } from '../realtime/supabaseRealtime';

const WebSocketContext = createContext(null);

const processedEvents = new Map();
export const isDuplicateEvent = (eventType, data) => {
  if (!eventType) return false;
  const id = data?.id || data?.task_id || data?.ref_id || '';
  const state = data?.status || data?.updated_at || data?.created_at || '';
  const key = `${eventType}:${id}:${state}`;
  const now = Date.now();

  if (processedEvents.has(key) && (now - processedEvents.get(key) < 4000)) {
    return true;
  }

  processedEvents.set(key, now);
  if (processedEvents.size > 200) {
    for (const [k, time] of processedEvents.entries()) {
      if (now - time > 10000) processedEvents.delete(k);
    }
  }

  return false;
};

// Synchronize in-memory cache with incoming authenticated server socket events
const syncCacheWithSocketEvent = (type, data) => {
  if (!type) return;
  if (type.startsWith('task.')) {
    if (type === 'task.deleted' && (data?.id || data?.task_id)) {
      apiCache.removeRecordFromLists('/tasks', data.id || data.task_id);
    } else if (data && (data.id || data.task_id)) {
      apiCache.updateRecordInLists('/tasks', data);
    } else {
      apiCache.invalidate('/tasks');
    }
    apiCache.invalidate('/analytics');
    apiCache.invalidate('/history');
  } else if (type.startsWith('project.')) {
    apiCache.invalidate('/projects');
    apiCache.invalidate('/analytics');
  } else if (type.startsWith('team.')) {
    apiCache.invalidate('/teams');
    apiCache.invalidate('/analytics');
  } else if (type.startsWith('chat.')) {
    apiCache.invalidate('/chat');
  } else if (type === 'notification.new') {
    apiCache.invalidate('/notifications');
  } else if (type === 'analytics.refresh') {
    apiCache.invalidate('/analytics');
  } else if (type === 'kpi.logged') {
    apiCache.invalidate('/kpi');
    apiCache.invalidate('/analytics');
  }
};

export const getWsUrl = () => {
  const envWsUrl = import.meta.env.VITE_WS_URL;
  if (envWsUrl) {
    return envWsUrl;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${window.location.host}/ws`;
    }
  }
  return 'wss://kss-workmate.onrender.com/ws';
};

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const isConnectedRef = useRef(false);
  const listeners = useRef(new Map()); // Map<eventType, Set<callback>>
  const activeRooms = useRef(new Set()); // Set<roomName>
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const fallbackPollIntervalRef = useRef(null);
  const isDestroyedRef = useRef(false);
  const lastKnownNotifIdsRef = useRef(new Set());
  const broadcastChannelRef = useRef(null);

  // Keep isConnectedRef in sync with state for polling logic
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  // Initialize cross-tab BroadcastChannel (Same-Origin isolated)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('workmate_realtime_bus');
        broadcastChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (event.data && event.data.type) {
            const { type, data, senderId } = event.data;
            if (senderId && user?.id && String(senderId) === String(user.id)) return;
            if (isDuplicateEvent(type, data)) return;

            syncCacheWithSocketEvent(type, data);

            const typeListeners = listeners.current.get(type);
            if (typeListeners) {
              typeListeners.forEach(cb => {
                try { cb(data); } catch (err) { console.error('[BC] Callback error:', err); }
              });
            }
          }
        };
      } catch (e) {
        console.warn('[Realtime] BroadcastChannel unavailable:', e);
      }
    }
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [user]);

  // Instant local event dispatch (0 ms latency)
  const dispatch = useCallback((eventType, data, { broadcast = true } = {}) => {
    if (!eventType) return;

    // Deduplicate event processing
    if (isDuplicateEvent(eventType, data)) {
      return;
    }

    const typeListeners = listeners.current.get(eventType);
    if (typeListeners) {
      typeListeners.forEach(cb => {
        try {
          cb(data !== undefined ? data : {});
        } catch (cbErr) {
          console.error('[EventBus] Listener callback error:', cbErr);
        }
      });
    }

    // Only broadcast thin advisory signals if broadcast is true
    if (broadcast) {
      broadcastRealtimeEvent(eventType, data);
    }
  }, []);

  const connect = useCallback(() => {
    if (isDestroyedRef.current || !user) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const wsUrl = getWsUrl();
    if (!wsUrl) return;

    try {
      if (ws.current) {
        try { ws.current.close(); } catch {}
        ws.current = null;
      }

      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        // Authenticate immediately with user JWT
        socket.send(JSON.stringify({ type: 'auth', token }));

        // Start heartbeat
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'connected') {
            // Auto join standard rooms
            socket.send(JSON.stringify({ type: 'join', room: 'global:all' }));
            if (user?.team_id) {
              socket.send(JSON.stringify({ type: 'join', room: `team:${user.team_id}` }));
            }
            if (['CEO', 'CTO', 'PM', 'HR'].includes(user?.role)) {
              socket.send(JSON.stringify({ type: 'join', room: 'global:admins' }));
            }

            activeRooms.current.forEach(room => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'join', room }));
              }
            });
          }

          if (msg.type && msg.type !== 'pong' && msg.type !== 'joined' && msg.type !== 'left') {
            // Synchronize cache with authoritative incoming server event
            syncCacheWithSocketEvent(msg.type, msg.data);
            dispatch(msg.type, msg.data !== undefined ? msg.data : msg, { broadcast: false });
          }
        } catch (e) {
          console.error('[WS] Failed to parse message', e);
        }
      };

      socket.onerror = () => {
        setIsConnected(false);
      };

      socket.onclose = () => {
        setIsConnected(false);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

        // Schedule reconnect if user is logged in
        if (!isDestroyedRef.current && user) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3500);
        }
      };
    } catch {
      setIsConnected(false);
      if (!isDestroyedRef.current && user) {
        reconnectTimeoutRef.current = setTimeout(connect, 3500);
      }
    }
  }, [user, dispatch]);

  // Adaptive background sync: Light, smart fallback that avoids hammering backend
  useEffect(() => {
    if (!user) {
      if (fallbackPollIntervalRef.current) clearInterval(fallbackPollIntervalRef.current);
      return;
    }

    let isPolling = false;
    const pollNotifications = async () => {
      if (isPolling || isDestroyedRef.current || document.hidden) return;
      isPolling = true;
      try {
        const notifs = await getNotifications();
        if (Array.isArray(notifs)) {
          const currentIds = new Set(notifs.map(n => String(n.id)));
          // Check for newly arrived notifications
          if (lastKnownNotifIdsRef.current.size > 0) {
            const newlyArrived = notifs.filter(n => !lastKnownNotifIdsRef.current.has(String(n.id)));
            newlyArrived.forEach(n => {
              dispatch('notification.new', {
                id: n.id,
                title: n.title,
                message: n.message,
                ref_id: n.ref_id,
                task_id: n.ref_id,
                event_type: n.event_type
              }, { broadcast: false });

              if (n.event_type) {
                dispatch(n.event_type, {
                  id: n.ref_id,
                  task_id: n.ref_id,
                  ref_id: n.ref_id
                }, { broadcast: false });
              }
            });
          }
          lastKnownNotifIdsRef.current = currentIds;
        }
      } catch {
        // Silently tolerate network blips
      } finally {
        isPolling = false;
      }
    };

    // Initial check
    pollNotifications();

    // Smart adaptive interval: 15s if WS disconnected, 45s if WS connected
    const setupInterval = () => {
      if (fallbackPollIntervalRef.current) clearInterval(fallbackPollIntervalRef.current);
      const intervalMs = isConnectedRef.current ? 45000 : 15000;
      fallbackPollIntervalRef.current = setInterval(pollNotifications, intervalMs);
    };

    setupInterval();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        pollNotifications();
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
          connect();
        }
        setupInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleVisibilityChange);

    return () => {
      if (fallbackPollIntervalRef.current) clearInterval(fallbackPollIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleVisibilityChange);
    };
  }, [user, dispatch, connect, isConnected]);

  useEffect(() => {
    isDestroyedRef.current = false;
    let cleanupSupabase = () => {};

    if (user) {
      connect();
      cleanupSupabase = initSupabaseRealtime(user, dispatch);
    } else {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      setIsConnected(false);
      activeRooms.current.clear();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    }

    return () => {
      isDestroyedRef.current = true;
      if (cleanupSupabase) cleanupSupabase();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [user, connect, dispatch]);

  const joinRoom = useCallback((room) => {
    if (!room) return;
    activeRooms.current.add(room);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'join', room }));
    }
  }, []);

  const leaveRoom = useCallback((room) => {
    if (!room) return;
    activeRooms.current.delete(room);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'leave', room }));
    }
  }, []);

  const subscribe = useCallback((eventType, callback) => {
    if (!eventType || !callback) return () => {};
    if (!listeners.current.has(eventType)) {
      listeners.current.set(eventType, new Set());
    }
    listeners.current.get(eventType).add(callback);
    return () => {
      listeners.current.get(eventType)?.delete(callback);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, joinRoom, leaveRoom, subscribe, dispatch }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
export default WebSocketContext;
