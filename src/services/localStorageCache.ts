/**
 * LocalStorage Cache Service
 *
 * Provides persistent caching of market quotes across browser sessions.
 * Uses localStorage for fast access to recent data.
 *
 * Features:
 * - Automatic TTL (time-to-live) expiration
 * - Type-safe generic interface
 * - Graceful error handling
 * - Storage quota monitoring
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class LocalStorageCache {
  private readonly prefix: string;
  private readonly maxAge: number;

  /**
   * Create a new LocalStorage cache instance
   *
   * @param prefix - Prefix for cache keys to avoid collisions
   * @param maxAge - Default TTL in milliseconds (default: 15 minutes)
   */
  constructor(prefix = 'market-cache', maxAge = 15 * 60 * 1000) {
    this.prefix = prefix;
    this.maxAge = maxAge;

    // Clean up expired entries on initialization
    this.cleanup();
  }

  /**
   * Get a cached value
   *
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): T | null {
    try {
      const cacheKey = `${this.prefix}:${key}`;
      const item = localStorage.getItem(cacheKey);

      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const age = Date.now() - entry.timestamp;

      // Check if expired
      if (age > entry.ttl) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn(`LocalStorage cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a cached value
   *
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Optional custom TTL (overrides default)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    try {
      const cacheKey = `${this.prefix}:${key}`;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.maxAge,
      };

      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      // Handle quota exceeded errors gracefully
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing old cache...');
        this.cleanup(true);

        // Try again after cleanup
        try {
          const cacheKey = `${this.prefix}:${key}`;
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.maxAge,
          };
          localStorage.setItem(cacheKey, JSON.stringify(entry));
        } catch (retryError) {
          console.error('Failed to cache after cleanup:', retryError);
        }
      } else {
        console.warn(`LocalStorage cache set error for key ${key}:`, error);
      }
    }
  }

  /**
   * Remove a cached value
   *
   * @param key - Cache key to remove
   */
  remove(key: string): void {
    try {
      const cacheKey = `${this.prefix}:${key}`;
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn(`LocalStorage cache remove error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache entries with this prefix
   */
  clear(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.prefix}:`)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('LocalStorage cache clear error:', error);
    }
  }

  /**
   * Clean up expired entries
   *
   * @param aggressive - If true, remove all entries (for quota issues)
   */
  private cleanup(aggressive = false): void {
    try {
      const keysToRemove: string[] = [];
      const now = Date.now();

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(`${this.prefix}:`)) continue;

        if (aggressive) {
          keysToRemove.push(key);
          continue;
        }

        try {
          const item = localStorage.getItem(key);
          if (!item) continue;

          const entry: CacheEntry<unknown> = JSON.parse(item);
          const age = now - entry.timestamp;

          if (age > entry.ttl) {
            keysToRemove.push(key);
          }
        } catch {
          // Remove corrupted entries
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      if (keysToRemove.length > 0) {
        console.log(`Cleaned up ${keysToRemove.length} cache entries`);
      }
    } catch (error) {
      console.warn('LocalStorage cache cleanup error:', error);
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Object with cache size and entry count
   */
  getStats(): { entryCount: number; estimatedSize: number } {
    try {
      let entryCount = 0;
      let estimatedSize = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(`${this.prefix}:`)) continue;

        entryCount++;
        const item = localStorage.getItem(key);
        if (item) {
          // Rough estimate: 2 bytes per character
          estimatedSize += item.length * 2;
        }
      }

      return { entryCount, estimatedSize };
    } catch (error) {
      console.warn('LocalStorage stats error:', error);
      return { entryCount: 0, estimatedSize: 0 };
    }
  }
}

// Export singleton instance
export const localStorageCache = new LocalStorageCache('market-cache', 15 * 60 * 1000);
