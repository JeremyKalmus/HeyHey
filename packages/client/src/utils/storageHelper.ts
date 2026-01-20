// Storage helper utility for localStorage/sessionStorage operations
// Provides type-safe save/load/clear/exists with optional expiration

export interface StorageHelperOptions {
  /** Maximum age in milliseconds before data expires (optional) */
  maxAge?: number;
  /** Storage type: 'local' or 'session' (default: 'local') */
  storageType?: 'local' | 'session';
}

export interface StorageHelper<T> {
  /** Save data to storage */
  save: (data: T) => void;
  /** Load data from storage (returns null if not found or expired) */
  load: () => T | null;
  /** Clear data from storage */
  clear: () => void;
  /** Check if valid data exists in storage */
  exists: () => boolean;
}

interface StoredData<T> {
  data: T;
  savedAt: number;
}

/**
 * Create a type-safe storage helper for a given key
 *
 * @param key - Storage key
 * @param options - Configuration options
 * @returns Storage helper with save/load/clear/exists methods
 */
export function createStorageHelper<T>(
  key: string,
  options: StorageHelperOptions = {}
): StorageHelper<T> {
  const { maxAge, storageType = 'local' } = options;

  const storage = storageType === 'session' ? sessionStorage : localStorage;

  const save = (data: T): void => {
    try {
      const stored: StoredData<T> = {
        data,
        savedAt: Date.now(),
      };
      storage.setItem(key, JSON.stringify(stored));
    } catch (error) {
      console.warn(`[Storage] Failed to save '${key}':`, error);
    }
  };

  const load = (): T | null => {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;

      const stored: StoredData<T> = JSON.parse(raw);

      // Check expiration if maxAge is configured
      if (maxAge !== undefined) {
        const age = Date.now() - stored.savedAt;
        if (age > maxAge) {
          clear();
          return null;
        }
      }

      return stored.data;
    } catch (error) {
      console.warn(`[Storage] Failed to load '${key}':`, error);
      clear();
      return null;
    }
  };

  const clear = (): void => {
    try {
      storage.removeItem(key);
    } catch (error) {
      console.warn(`[Storage] Failed to clear '${key}':`, error);
    }
  };

  const exists = (): boolean => {
    return load() !== null;
  };

  return { save, load, clear, exists };
}
