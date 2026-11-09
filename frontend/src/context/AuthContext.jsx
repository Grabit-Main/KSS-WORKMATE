import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import {
  recordUserActivity,
  clearSessionActivity,
  broadcastSessionEvent
} from '../services/sessionInactivityService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    if (savedUser || !token) return false;
    return true;
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch (err) {
          // Token invalid/expired handled by interceptor
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    if (res.data.user?.id) {
      recordUserActivity(res.data.user.id, { force: true });
    }
  };

  const updateCurrentUser = (updatedUser) => {
    setUser(updatedUser);
    try {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('Failed to save user to localStorage:', e);
    }
  };

  const logout = () => {
    if (user?.id) {
      clearSessionActivity(user.id);
      broadcastSessionEvent({
        type: 'SESSION_LOGOUT',
        userId: String(user.id),
        reason: 'manual_logout'
      });
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, updateCurrentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
