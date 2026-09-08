import api from '../api/axios';

const STORAGE_TOKEN_KEY = 'workmate_gdrive_access_token';
const STORAGE_EXPIRY_KEY = 'workmate_gdrive_token_expires_at';

let cachedClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '562995893354-o2a3lj5qmfo96f9u445fb1bvtm9c5pbj.apps.googleusercontent.com';

/**
 * Ensures Google Identity Services (GIS) client library is loaded
 */
export const ensureGisScript = () => {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      // fallback check
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

/**
 * Retrieves client ID either from env or backend config
 */
export const getGoogleClientId = async () => {
  if (cachedClientId) return cachedClientId;
  try {
    const res = await api.get('/auth/google-client-id');
    if (res.data?.client_id) {
      cachedClientId = res.data.client_id;
      return cachedClientId;
    }
  } catch (e) {
    console.warn('[GDRIVE] Could not fetch Google Client ID from backend:', e);
  }
  return cachedClientId;
};

/**
 * Returns currently stored unexpired access token, or null
 */
export const getStoredGoogleToken = () => {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  const expiresAt = parseInt(localStorage.getItem(STORAGE_EXPIRY_KEY) || '0', 10);
  // Must be valid for at least 60 more seconds
  if (token && expiresAt > Date.now() + 60000) {
    return token;
  }
  if (token && expiresAt <= Date.now()) {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_EXPIRY_KEY);
  }
  return null;
};

/**
 * Checks if user is authenticated with Google Drive
 */
export const isGoogleDriveConnected = () => {
  return !!getStoredGoogleToken();
};

/**
 * Triggers interactive Google OAuth 2.0 popup for the user to authenticate
 * Returns Promise<string> access_token
 */
export const requestGoogleAccessToken = async () => {
  await ensureGisScript();
  const clientId = await getGoogleClientId();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services script failed to load. Please check your internet connection.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response) => {
          if (response.error) {
            console.error('[GDRIVE OAUTH ERROR]', response);
            reject(new Error(response.error_description || response.error || 'Google authentication was cancelled or failed'));
            return;
          }

          if (response.access_token) {
            const expiresIn = parseInt(response.expires_in, 10) || 3600;
            const expiresAt = Date.now() + expiresIn * 1000;
            localStorage.setItem(STORAGE_TOKEN_KEY, response.access_token);
            localStorage.setItem(STORAGE_EXPIRY_KEY, expiresAt.toString());
            window.dispatchEvent(new Event('gdrive_auth_change'));
            resolve(response.access_token);
          } else {
            reject(new Error('No access token received from Google'));
          }
        },
      });

      // Prompt user with Google Sign-in / Permission dialog
      client.requestAccessToken({ prompt: '' });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Disconnects / removes Google Drive token
 */
export const disconnectGoogleDrive = () => {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (token && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {});
    } catch (e) {
      console.warn('[GDRIVE] Token revocation warning:', e);
    }
  }
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_EXPIRY_KEY);
  window.dispatchEvent(new Event('gdrive_auth_change'));
};
