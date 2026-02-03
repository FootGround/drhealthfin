/**
 * IndexedDB Cache Service
 *
 * Provides persistent caching of historical market data using IndexedDB.
 * Better than localStorage for:
 * - Larger data sets (sparklines, time series)
 * - Structured queries
 * - No serialization overhead
 *
 * Features:
 * - Automatic TTL expiration
 * - Efficient bulk operations
 * - Offline support
 * - No storage quota issues (within reason)
 */

interface HistoricalCacheEntry {
  id: string; // ticker:interval (e.g., "SPY:5min")
  ticker: string;
  interval: string;
  data: number[];
  timestamp: number;
  ttl: number;
}

const DB_NAME = 'MarketDataCache';
const DB_VERSION = 1;
const STORE_NAME = 'historical';

export class IndexedDBCache {
  private db: IDBDatabase | null = null;
  private readonly defaultTTL: number;
  private initPromise: Promise<void>;

  /**
   * Create a new IndexedDB cache instance
   *
   * @param defaultTTL - Default TTL in milliseconds (default: 1 hour)
   */
  constructor(defaultTTL = 60 * 60 * 1000) {
    this.defaultTTL = defaultTTL;
    this.initPromise = this.init();
  }

  /**
   * Initialize the IndexedDB database
   */
  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('IndexedDB failed to open:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Create object store if it doesn't exist
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

            // Create indices for efficient queries
            store.createIndex('ticker', 'ticker', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      } catch (error) {
        console.error('IndexedDB initialization error:', error);
        reject(error);
      }
    });
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.initPromise;
    }
  }

  /**
   * Get historical data from cache
   *
   * @param ticker - Stock ticker symbol
   * @param interval - Time interval (e.g., '5min', '1h', '1d')
   * @returns Cached historical data array or null if not found/expired
   */
  async get(ticker: string, interval: string): Promise<number[] | null> {
    try {
      await this.ensureInit();

      if (!this.db) return null;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const id = `${ticker}:${interval}`;
        const request = store.get(id);

        request.onsuccess = () => {
          const entry = request.result as HistoricalCacheEntry | undefined;

          if (!entry) {
            resolve(null);
            return;
          }

          // Check if expired
          const age = Date.now() - entry.timestamp;
          if (age > entry.ttl) {
            // Remove expired entry
            this.remove(ticker, interval);
            resolve(null);
            return;
          }

          resolve(entry.data);
        };

        request.onerror = () => {
          console.warn(`IndexedDB get error for ${id}:`, request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.warn(`IndexedDB get error:`, error);
      return null;
    }
  }

  /**
   * Set historical data in cache
   *
   * @param ticker - Stock ticker symbol
   * @param interval - Time interval
   * @param data - Historical price data array
   * @param ttl - Optional custom TTL (overrides default)
   */
  async set(
    ticker: string,
    interval: string,
    data: number[],
    ttl?: number
  ): Promise<void> {
    try {
      await this.ensureInit();

      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const entry: HistoricalCacheEntry = {
          id: `${ticker}:${interval}`,
          ticker,
          interval,
          data,
          timestamp: Date.now(),
          ttl: ttl || this.defaultTTL,
        };

        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn(`IndexedDB set error for ${entry.id}:`, request.error);
          resolve(); // Don't reject, just log
        };
      });
    } catch (error) {
      console.warn(`IndexedDB set error:`, error);
    }
  }

  /**
   * Remove a specific cache entry
   *
   * @param ticker - Stock ticker symbol
   * @param interval - Time interval
   */
  async remove(ticker: string, interval: string): Promise<void> {
    try {
      await this.ensureInit();

      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const id = `${ticker}:${interval}`;
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn(`IndexedDB remove error for ${id}:`, request.error);
          resolve();
        };
      });
    } catch (error) {
      console.warn(`IndexedDB remove error:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.ensureInit();

      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('IndexedDB cache cleared');
          resolve();
        };

        request.onerror = () => {
          console.warn('IndexedDB clear error:', request.error);
          resolve();
        };
      });
    } catch (error) {
      console.warn('IndexedDB clear error:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    try {
      await this.ensureInit();

      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();
        const now = Date.now();
        let removedCount = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

          if (cursor) {
            const entry = cursor.value as HistoricalCacheEntry;
            const age = now - entry.timestamp;

            if (age > entry.ttl) {
              cursor.delete();
              removedCount++;
            }

            cursor.continue();
          } else {
            if (removedCount > 0) {
              console.log(`Cleaned up ${removedCount} expired IndexedDB entries`);
            }
            resolve();
          }
        };

        request.onerror = () => {
          console.warn('IndexedDB cleanup error:', request.error);
          resolve();
        };
      });
    } catch (error) {
      console.warn('IndexedDB cleanup error:', error);
    }
  }

  /**
   * Get all cached tickers
   *
   * @returns Array of unique ticker symbols in cache
   */
  async getAllTickers(): Promise<string[]> {
    try {
      await this.ensureInit();

      if (!this.db) return [];

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('ticker');
        const request = index.getAllKeys();

        request.onsuccess = () => {
          const tickers = Array.from(new Set(request.result as string[]));
          resolve(tickers);
        };

        request.onerror = () => {
          console.warn('IndexedDB getAllTickers error:', request.error);
          resolve([]);
        };
      });
    } catch (error) {
      console.warn('IndexedDB getAllTickers error:', error);
      return [];
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Object with entry count and estimated size
   */
  async getStats(): Promise<{ entryCount: number; estimatedSize: number }> {
    try {
      await this.ensureInit();

      if (!this.db) return { entryCount: 0, estimatedSize: 0 };

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.count();

        request.onsuccess = () => {
          // Rough estimate: 8 bytes per number, plus overhead
          const entryCount = request.result;
          const estimatedSize = entryCount * 20 * 8; // ~20 data points per entry
          resolve({ entryCount, estimatedSize });
        };

        request.onerror = () => {
          console.warn('IndexedDB getStats error:', request.error);
          resolve({ entryCount: 0, estimatedSize: 0 });
        };
      });
    } catch (error) {
      console.warn('IndexedDB getStats error:', error);
      return { entryCount: 0, estimatedSize: 0 };
    }
  }
}

// Export singleton instance
export const indexedDBCache = new IndexedDBCache(60 * 60 * 1000); // 1 hour TTL
