import api from '../api/axios';

const STORAGE_TOKEN_KEY = 'workmate_gdrive_access_token';
const STORAGE_EXPIRY_KEY = 'workmate_gdrive_token_expires_at';

const DEFAULT_CLIENT_ID = '271988357300-r0hbpq3r5gj5vccpb6tng0587q628dj2.apps.googleusercontent.com';

const sanitizeClientId = (id) => {
  if (!id) return '';
  return id.replace(/[\r\n\s]+/g, '').trim();
};

let cachedClientId = sanitizeClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID) || DEFAULT_CLIENT_ID;

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
 * Retrieves client ID either from backend config, env, or local storage
 */
export const getGoogleClientId = async () => {
  // Check local storage custom override first if valid
  const customId = sanitizeClientId(localStorage.getItem('workmate_gdrive_client_id'));
  if (customId && !customId.includes('562995893354')) {
    cachedClientId = customId;
    return cachedClientId;
  } else if (customId && customId.includes('562995893354')) {
    localStorage.removeItem('workmate_gdrive_client_id');
  }

  // Try fetching from backend API
  try {
    const res = await api.get('/auth/google-client-id');
    const backendId = sanitizeClientId(res.data?.client_id);
    if (backendId && !backendId.includes('562995893354')) {
      cachedClientId = backendId;
      return cachedClientId;
    }
  } catch (e) {
    console.warn('[GDRIVE] Could not fetch Google Client ID from backend:', e);
  }

  const envId = sanitizeClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  return envId || DEFAULT_CLIENT_ID;
};

export const setGoogleClientIdOverride = (clientId) => {
  if (clientId) {
    localStorage.setItem('workmate_gdrive_client_id', clientId.trim());
    cachedClientId = clientId.trim();
  } else {
    localStorage.removeItem('workmate_gdrive_client_id');
    cachedClientId = '';
  }
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
  let clientId = await getGoogleClientId();

  if (!clientId) {
    const userPromptId = window.prompt(
      'Google OAuth Client ID is missing.\n\nPlease enter your Google Cloud OAuth Client ID (e.g. xxx.apps.googleusercontent.com):'
    );
    if (userPromptId && userPromptId.trim()) {
      setGoogleClientIdOverride(userPromptId.trim());
      clientId = userPromptId.trim();
    } else {
      throw new Error('Google OAuth Client ID is required to connect to Google Drive.');
    }
  }

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
            if (response.error === 'invalid_client' || response.error_description?.includes('invalid_client')) {
              setGoogleClientIdOverride('');
            }
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
