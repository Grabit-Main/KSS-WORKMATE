import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getNotifications } from '../api/notifications';

const WebSocketContext = createContext(null);

const getWsUrl = () => {
  const envWsUrl = import.meta.env.VITE_WS_URL;
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${window.location.hostname}:8000/ws`;
    }
  }
  return envWsUrl || (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` : '');
};

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const listeners = useRef(new Map()); // Map<eventType, Set<callback>>
  const activeRooms = useRef(new Set()); // Set<roomName>
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const fallbackPollIntervalRef = useRef(null);
  const isDestroyedRef = useRef(false);
  const lastKnownNotifIdsRef = useRef(new Set());
  const broadcastChannelRef = useRef(null);

  // Initialize cross-tab BroadcastChannel
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('workmate_realtime_bus');
        broadcastChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (event.data && event.data.type) {
            const { type, data } = event.data;
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
  }, []);

  // Instant local event dispatch (0 ms latency)
  const dispatch = useCallback((eventType, data, { broadcast = true } = {}) => {
    if (!eventType) return;
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

    // Propagate to other tabs immediately
    if (broadcast && broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type: eventType, data });
      } catch (err) {
        console.warn('[EventBus] Broadcast post error:', err);
      }
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
        // Authenticate immediately
        socket.send(JSON.stringify({ type: 'auth', token }));

        // Start heartbeat
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'connected') {
            activeRooms.current.forEach(room => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'join', room }));
              }
            });
          }

          if (msg.type) {
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
          }, 3000);
        }
      };
    } catch {
      setIsConnected(false);
      if (!isDestroyedRef.current && user) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    }
  }, [user, dispatch]);

  // Adaptive High-Frequency Fallback Poller for instant updates when WS is disconnected
  useEffect(() => {
    if (!user) {
      if (fallbackPollIntervalRef.current) clearInterval(fallbackPollIntervalRef.current);
      return;
    }

    let isPolling = false;
    const pollFast = async () => {
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
              });
            });
          }
          lastKnownNotifIdsRef.current = currentIds;
        }
      } catch {
        // Silently tolerate temporary network drops
      } finally {
        isPolling = false;
      }
    };

    // Initial poll
    pollFast();

    // High frequency 1500ms sync
    fallbackPollIntervalRef.current = setInterval(pollFast, 1500);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        pollFast();
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
          connect();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (fallbackPollIntervalRef.current) clearInterval(fallbackPollIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, dispatch, connect]);

  useEffect(() => {
    isDestroyedRef.current = false;
    if (user) {
      connect();
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
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [user, connect]);

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
