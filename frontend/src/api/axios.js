import axios from 'axios';
import { apiCache } from './cache';
import { broadcastRealtimeEvent } from '../realtime/supabaseRealtime';

export const getApiBaseUrl = () => {
  let envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    if (envUrl.includes('onrender.vercel.com')) {
      envUrl = envUrl.replace('onrender.vercel.com', 'onrender.com');
    }
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }
  }
  return 'https://kss-workmate.onrender.com/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  // Prevent duplicate /api/ prefix if baseURL already contains /api
  if (config.url && config.url.startsWith('/api/')) {
    config.url = config.url.slice(4);
  }

  const isPublicAuthUrl =
    config.url?.includes('/auth/login') ||
    config.url?.includes('/auth/warmup') ||
    config.url?.includes('/auth/refresh') ||
    config.url?.includes('/auth/forgot-password') ||
    config.url?.includes('/auth/verify-otp') ||
    config.url?.includes('/auth/reset-password') ||
    config.url?.includes('/auth/google-client-id');

  if (!isPublicAuthUrl) {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Don't intercept auth login/refresh calls
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${getApiBaseUrl()}/auth/refresh`,
          { refresh_token: refreshToken }
        );
        const { access_token, refresh_token: newRefresh } = res.data;
        localStorage.setItem('access_token', access_token);
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        if (refreshErr.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          apiCache.clear();
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper to determine cache TTL based on endpoint sensitivity
const getEndpointTTL = (url = '') => {
  if (url.includes('/users') || url.includes('/teams') || url.includes('/projects')) {
    return 60 * 1000; // 60 seconds (rarely mutated, instantly invalidated on change)
  }
  if (url.includes('/tasks')) {
    return 30 * 1000; // 30 seconds
  }
  if (url.includes('/kpi') || url.includes('/analytics')) {
    return 30 * 1000; // 30 seconds
  }
  if (url.includes('/notifications')) {
    return 10 * 1000; // 10 seconds
  }
  if (url.includes('/chat')) {
    return 3 * 1000; // 3 seconds
  }
  return 20 * 1000; // 20 seconds default
};

// Invalidate cache and broadcast secure, thin invalidation signals
const handleMutationSideEffects = (method, url) => {
  const cleanUrl = url || '';

  // 1. Task Chat (MUST be checked before generic /tasks!)
  if (cleanUrl.includes('/tasks/') && cleanUrl.includes('/chat')) {
    apiCache.invalidate('/chat');
    // Task chat message dispatched via WebSocket; do not corrupt task cache or broadcast task.created
    return;
  }

  // 2. Chat endpoints (direct, channel, project)
  if (cleanUrl.includes('/chat')) {
    apiCache.invalidate('/chat');
    // Handled via authenticated WebSocket
    return;
  }

  // 3. Task specific endpoints (not chat)
  if (cleanUrl.includes('/tasks')) {
    apiCache.invalidate('/tasks');
    apiCache.invalidate('/analytics');
    apiCache.invalidate('/history');
    // Thin non-confidential advisory signal: no sensitive payload transmitted
    broadcastRealtimeEvent('task.invalidated', { scope: 'tasks' });
    return;
  }

  // 4. Projects
  if (cleanUrl.includes('/projects')) {
    apiCache.invalidate('/projects');
    apiCache.invalidate('/analytics');
    broadcastRealtimeEvent('project.invalidated', { scope: 'projects' });
    return;
  }

  // 5. Teams
  if (cleanUrl.includes('/teams')) {
    apiCache.invalidate('/teams');
    apiCache.invalidate('/analytics');
    broadcastRealtimeEvent('team.invalidated', { scope: 'teams' });
    return;
  }

  // 6. Users
  if (cleanUrl.includes('/users')) {
    apiCache.invalidate('/users');
    return;
  }

  // 7. KPI (Sensitive - NEVER broadcast to public Supabase!)
  if (cleanUrl.includes('/kpi')) {
    apiCache.invalidate('/kpi');
    apiCache.invalidate('/analytics');
    return;
  }

  // 8. Goals, Notifications, Feedback/Reviews
  if (cleanUrl.includes('/goals')) {
    apiCache.invalidate('/goals');
    apiCache.invalidate('/analytics');
    return;
  }
  if (cleanUrl.includes('/notifications')) {
    apiCache.invalidate('/notifications');
    return;
  }
  if (cleanUrl.includes('/feedback') || cleanUrl.includes('/reviews')) {
    apiCache.invalidate('/feedback');
    apiCache.invalidate('/reviews');
    return;
  }
};

// Wrap native methods with Caching & In-Flight Request Deduplication
const origGet = api.get.bind(api);
const origPost = api.post.bind(api);
const origPut = api.put.bind(api);
const origDelete = api.delete.bind(api);
const origPatch = api.patch.bind(api);

api.get = async (url, config = {}) => {
  const shouldBypass =
    config.forceRefresh ||
    config.headers?.['X-Bypass-Cache'] ||
    config.params?._nocache ||
    url.includes('/auth/') ||
    url.includes('/upload');

  if (shouldBypass) {
    return origGet(url, config);
  }

  // 1. Check in-memory fresh cache (0 ms instant response for active user)
  const cached = apiCache.get(url, config.params);
  if (cached && !cached.isExpired) {
    return {
      data: cached.data,
      status: 200,
      statusText: 'OK (Cache)',
      headers: {},
      config,
      cached: true,
    };
  }

  // 2. Check identical in-flight request (Concurrent Deduplication)
  const inFlightPromise = apiCache.getInFlight(url, config.params);
  if (inFlightPromise) {
    return inFlightPromise;
  }

  // 3. Initiate request and register in-flight promise
  const ttl = getEndpointTTL(url);
  const reqPromise = origGet(url, config)
    .then((res) => {
      if (res && res.status >= 200 && res.status < 300) {
        apiCache.set(url, config.params, res.data, ttl);
      }
      return res;
    })
    .catch((err) => {
      // Graceful offline/error stale-while-revalidate fallback
      if (cached && (!err.response || err.response.status >= 500)) {
        console.warn(`[ApiCache] Serving stale cache for ${url} due to network error`);
        return {
          data: cached.data,
          status: 200,
          statusText: 'OK (Stale Cache)',
          headers: {},
          config,
          cached: true,
          stale: true,
        };
      }
      throw err;
    });

  apiCache.setInFlight(url, config.params, reqPromise);
  return reqPromise;
};

api.post = async (url, data, config) => {
  const res = await origPost(url, data, config);
  handleMutationSideEffects('post', url);
  return res;
};

api.put = async (url, data, config) => {
  const res = await origPut(url, data, config);
  handleMutationSideEffects('put', url);
  return res;
};

api.delete = async (url, config) => {
  const res = await origDelete(url, config);
  handleMutationSideEffects('delete', url);
  return res;
};

api.patch = async (url, data, config) => {
  const res = await origPatch(url, data, config);
  handleMutationSideEffects('patch', url);
  return res;
};

export default api;
