import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const listeners = useRef(new Map()); // Map<eventType, Set<callback>>

  useEffect(() => {
    if (!user) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) return;

    let wsUrl = import.meta.env.VITE_WS_URL;
    // For local dev where VITE_WS_URL might just be ws://localhost:8000/ws
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WS Connected');
      setIsConnected(true);
      // Authenticate
      ws.current.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type) {
          const typeListeners = listeners.current.get(msg.type);
          if (typeListeners) {
            typeListeners.forEach(cb => cb(msg.data || msg));
          }
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    ws.current.onclose = () => {
      console.log('WS Disconnected');
      setIsConnected(false);
      // ponytail: basic reconnect logic could go here, omitting for brevity/lazy mode unless needed.
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user]);

  const joinRoom = useCallback((room) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'join', room }));
    }
  }, []);

  const leaveRoom = useCallback((room) => {
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
