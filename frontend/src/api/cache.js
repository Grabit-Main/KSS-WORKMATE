/**
 * KSS Workmate - High-Performance In-Memory API Cache & In-Flight Request Deduplicator
 * 
 * Features:
 * 1. Strict Account Isolation: Cache keys are partitioned by authenticated user ID.
 * 2. In-Flight Request Deduplication: Merges concurrent identical GET requests.
 * 3. Zero Cross-Account Leakage: Cache is purged on logout, account switch, or auth invalidation.
 * 4. Stale Data Rejection: Expired cache entries are immediately dropped.
 */

export const getActiveUserId = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u && (u.id || u.sub)) return String(u.id || u.sub);
      }
      const token = localStorage.getItem('access_token');
      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload && payload.sub) return String(payload.sub);
        }
      }
    }
  } catch {}
  return 'anonymous';
};

class ApiCacheManager {
  constructor() {
    this.cache = new Map(); // key -> { data, timestamp, expiresAt, userId }
    this.inFlight = new Map(); // key -> Promise
    this.defaultTTL = 30 * 1000; // 30 seconds default freshness window
  }

  generateKey(url, params = {}, customUserId = null) {
    try {
      const userId = customUserId || getActiveUserId();
      const cleanUrl = url.startsWith('/') ? url : `/${url}`;
      const sortedParams = Object.keys(params || {})
        .sort()
        .reduce((acc, k) => {
          if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
            acc[k] = params[k];
          }
          return acc;
        }, {});
      return `${userId}::${cleanUrl}?${JSON.stringify(sortedParams)}`;
    } catch {
      return `${getActiveUserId()}::${url}`;
    }
  }

  get(url, params) {
    const key = this.generateKey(url, params);
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Strict freshness enforcement: drop expired cache immediately
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Verify current user matches entry user
    const currentUserId = getActiveUserId();
    if (entry.userId && entry.userId !== currentUserId) {
      this.cache.delete(key);
      return null;
    }

    return {
      data: entry.data,
      isExpired: false,
      age: Date.now() - entry.timestamp
    };
  }

  set(url, params, data, ttlMs = this.defaultTTL) {
    const currentUserId = getActiveUserId();
    const key = this.generateKey(url, params, currentUserId);
    this.cache.set(key, {
      data,
      userId: currentUserId,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs
    });
  }

  getInFlight(url, params) {
    const key = this.generateKey(url, params);
    return this.inFlight.get(key) || null;
  }

  setInFlight(url, params, promise) {
    const key = this.generateKey(url, params);
    this.inFlight.set(key, promise);
    promise.finally(() => {
      this.inFlight.delete(key);
    });
  }

  /**
   * Invalidate cache entries matching a prefix or URL pattern for the active user.
   */
  invalidate(pattern, targetUserId = null) {
    if (!pattern) {
      this.clear();
      return;
    }

    const userId = targetUserId || getActiveUserId();
    const cleanPattern = pattern.startsWith('/') ? pattern : `/${pattern}`;
    const userPrefix = `${userId}::`;

    for (const key of this.cache.keys()) {
      if (key.startsWith(userPrefix) && key.includes(cleanPattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Update cached record in-place without refetching from server.
   * Only mutates entries belonging to the authenticated user.
   */
  updateRecordInLists(listKeyPrefix, updatedRecord, idField = 'id') {
    if (!updatedRecord || !updatedRecord[idField]) return;
    const targetId = String(updatedRecord[idField]);
    const userId = getActiveUserId();
    const userPrefix = `${userId}::`;
    const cleanPrefix = listKeyPrefix.startsWith('/') ? listKeyPrefix : `/${listKeyPrefix}`;

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(userPrefix) && key.includes(cleanPrefix) && Array.isArray(entry.data)) {
        let changed = false;
        const nextList = entry.data.map(item => {
          if (String(item[idField]) === targetId) {
            changed = true;
            return { ...item, ...updatedRecord };
          }
          return item;
        });

        if (changed) {
          entry.data = nextList;
          entry.timestamp = Date.now();
        }
      }
    }
  }

  /**
   * Remove record from cached lists in-place.
   */
  removeRecordFromLists(listKeyPrefix, recordId, idField = 'id') {
    if (!recordId) return;
    const targetId = String(recordId);
    const userId = getActiveUserId();
    const userPrefix = `${userId}::`;
    const cleanPrefix = listKeyPrefix.startsWith('/') ? listKeyPrefix : `/${listKeyPrefix}`;

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(userPrefix) && key.includes(cleanPrefix) && Array.isArray(entry.data)) {
        const filtered = entry.data.filter(item => String(item[idField]) !== targetId);
        if (filtered.length !== entry.data.length) {
          entry.data = filtered;
          entry.timestamp = Date.now();
        }
      }
    }
  }

  /**
   * Complete memory purge (invoked on logout or user switch).
   */
  clear() {
    this.cache.clear();
    this.inFlight.clear();
  }
}

export const apiCache = new ApiCacheManager();
