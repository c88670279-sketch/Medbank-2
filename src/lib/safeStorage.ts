// Safe Storage Utility with In-Memory fallback for QuotaExceededError and private browsing restrictions

const memoryStorage = new Map<string, string>();

export const safeStorage = {
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
      // Synchronize in-memory cache as well
      memoryStorage.set(key, value);
    } catch (e) {
      console.warn(`[Storage Warning] Failed to write key "${key}" to localStorage (possibly exceeded quota). Storing in memory.`, e);
      memoryStorage.set(key, value);
    }
  },

  getItem(key: string): string | null {
    // If we have it in-memory, prefer it (since it might be more complete if quota was exceeded)
    if (memoryStorage.has(key)) {
      return memoryStorage.get(key) || null;
    }
    try {
      const val = localStorage.getItem(key);
      if (val !== null) {
        memoryStorage.set(key, val);
      }
      return val;
    } catch (e) {
      console.error(`[Storage Error] Failed to read key "${key}" from localStorage:`, e);
      return null;
    }
  },

  removeItem(key: string): void {
    memoryStorage.delete(key);
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`[Storage Error] Failed to remove key "${key}" from localStorage:`, e);
    }
  },

  clear(): void {
    memoryStorage.clear();
    try {
      localStorage.clear();
    } catch (e) {
      console.error('[Storage Error] Failed to clear localStorage:', e);
    }
  }
};
