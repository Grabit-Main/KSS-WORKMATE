import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

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
  const isDestroyedRef = useRef(false);

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

      console.log('[WS] Connecting to:', wsUrl);
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        console.log('[WS] Connection open, authenticating...');
        setIsConnected(true);
        // Authenticate immediately
        socket.send(JSON.stringify({ type: 'auth', token }));

        // Start heartbeat to prevent proxy timeout
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
          // If authenticated, restore all joined rooms
          if (msg.type === 'connected') {
            console.log('[WS] Authenticated as user:', msg.user_id);
            activeRooms.current.forEach(room => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'join', room }));
              }
            });
          }

          if (msg.type) {
            const typeListeners = listeners.current.get(msg.type);
            if (typeListeners) {
              typeListeners.forEach(cb => {
                try {
                  cb(msg.data !== undefined ? msg.data : msg);
                } catch (cbErr) {
                  console.error('[WS] Listener callback error:', cbErr);
                }
              });
            }
          }
        } catch (e) {
          console.error('[WS] Failed to parse message', e);
        }
      };

      socket.onerror = (err) => {
        console.warn('[WS] Socket error, will reconnect:', err);
      };

      socket.onclose = (e) => {
        console.log('[WS] Socket disconnected, code:', e.code);
        setIsConnected(false);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

        // Schedule reconnect if user is still logged in
        if (!isDestroyedRef.current && user) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WS] Attempting reconnect...');
            connect();
          }, 3000);
        }
      };
    } catch (err) {
      console.error('[WS] Connection failed:', err);
      if (!isDestroyedRef.current && user) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    }
  }, [user]);

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
    if (!listeners.current.has(eventType)) {
      listeners.current.set(eventType, new Set());
    }
    listeners.current.get(eventType).add(callback);
    return () => {
      listeners.current.get(eventType)?.delete(callback);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, joinRoom, leaveRoom, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
export default WebSocketContext;
