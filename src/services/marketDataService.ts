import { API_CONFIG, CACHE_TTL } from '@/constants/apiConfig';
import { SYMBOL_MAP } from '@/constants/instruments';
import { FinnhubQuote, TwelveDataResponse, CacheEntry, APIError } from '@/types/api';
import { fetchWithRetry } from '@/utils/retryHelper';
import { RateLimiter } from './rateLimiter';
import { localStorageCache } from './localStorageCache';
import { indexedDBCache } from './indexedDBCache';
import { staticDataService } from './staticDataService';

class MarketDataService {
  private cache = new Map<string, CacheEntry<FinnhubQuote>>();
  private finnhubLimiter: RateLimiter;
  private twelveLimiter: RateLimiter;
  private useStaticData: boolean = true; // Prefer static data by default

  constructor() {
    this.finnhubLimiter = new RateLimiter(API_CONFIG.finnhub.rateLimit.safeLimit);
    this.twelveLimiter = new RateLimiter(API_CONFIG.twelveData.rateLimit.callsPerMinute);

    // Clean up expired cache entries on startup
    this.initializeCache();
  }

  /**
   * Initialize cache and clean up expired entries
   */
  private async initializeCache() {
    try {
      // Clean up IndexedDB in background
      indexedDBCache.cleanup();
    } catch (error) {
      console.warn('Cache initialization warning:', error);
    }
  }

  /**
   * Fetch real-time quote with hybrid static/API approach
   *
   * Priority order:
   * 1. Static data from GitHub Actions (secure, fast)
   * 2. Memory cache (fastest)
   * 3. LocalStorage cache (persistent)
   * 4. Live API (fallback)
   */
  async fetchQuote(ticker: string): Promise<FinnhubQuote> {
    // Layer 0: Try static data first (if enabled and available)
    if (this.useStaticData) {
      try {
        const staticInstrument = await staticDataService.getInstrument(ticker);
        if (staticInstrument) {
          const quote: FinnhubQuote = {
            c: staticInstrument.currentPrice,
            pc: staticInstrument.previousClose,
            h: staticInstrument.high || staticInstrument.currentPrice,
            l: staticInstrument.low || staticInstrument.currentPrice,
            o: staticInstrument.open || staticInstrument.previousClose,
            t: Date.now(),
          };

          // Cache for faster subsequent access
          this.cache.set(ticker, { data: quote, timestamp: Date.now() });

          return quote;
        }
      } catch (error) {
        console.warn(`Static data unavailable for ${ticker}, falling back to cache/API`);
        // Continue to fallback layers
      }
    }

    // Layer 1: Check in-memory cache (fastest)
    const memoryCached = this.cache.get(ticker);
    if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_TTL) {
      return memoryCached.data;
    }

    // Layer 2: Check LocalStorage cache (persists across refreshes)
    const storageCached = localStorageCache.get<FinnhubQuote>(`quote:${ticker}`);
    if (storageCached) {
      // Populate memory cache
      this.cache.set(ticker, { data: storageCached, timestamp: Date.now() });
      return storageCached;
    }

    // Layer 3: Fetch from API (fallback only)
    const apiSymbol = SYMBOL_MAP[ticker] || ticker;

    return this.finnhubLimiter.execute(async () => {
      try {
        const url = `${API_CONFIG.finnhub.baseUrl}/quote?symbol=${apiSymbol}&token=${API_CONFIG.finnhub.apiKey}`;
        const data = await fetchWithRetry<FinnhubQuote>(url);

        // Cache in all layers
        this.cache.set(ticker, { data, timestamp: Date.now() });
        localStorageCache.set(`quote:${ticker}`, data, CACHE_TTL);

        return data;
      } catch (err) {
        throw this.handleError(err, ticker);
      }
    });
  }

  /**
   * Fetch historical data from Twelve Data with IndexedDB caching
   * Also checks static data service for sparklines
   */
  async fetchHistorical(
    ticker: string,
    interval: string = '5min',
    outputsize: number = 20
  ): Promise<number[]> {
    // Try static data service first (for sparklines)
    if (this.useStaticData) {
      try {
        const staticInstrument = await staticDataService.getInstrument(ticker);
        if (staticInstrument?.sparkline && staticInstrument.sparkline.length > 0) {
          return staticInstrument.sparkline;
        }
      } catch (error) {
        console.warn(`Static sparkline unavailable for ${ticker}`);
      }
    }

    // Check IndexedDB cache (persists across sessions)
    const cached = await indexedDBCache.get(ticker, interval);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const apiSymbol = SYMBOL_MAP[ticker] || ticker;

    return this.twelveLimiter.execute(async () => {
      try {
        const url = `${API_CONFIG.twelveData.baseUrl}/time_series?symbol=${apiSymbol}&interval=${interval}&outputsize=${outputsize}&apikey=${API_CONFIG.twelveData.apiKey}`;
        const data = await fetchWithRetry<TwelveDataResponse>(url);

        if (!data.values || data.values.length === 0) {
          throw new Error(`No historical data available for ${ticker}`);
        }

        // Convert to array of closing prices
        const prices = data.values.map((v) => parseFloat(v.close)).reverse();

        // Cache in IndexedDB (1 hour TTL for historical data)
        await indexedDBCache.set(ticker, interval, prices, 60 * 60 * 1000);

        return prices;
      } catch (err) {
        throw this.handleError(err, ticker);
      }
    });
  }

  /**
   * Batch fetch multiple symbols
   * Optimized to use static data service for bulk requests
   */
  async fetchBatch(tickers: string[]): Promise<Map<string, FinnhubQuote>> {
    // Try static data service first (much faster for bulk requests)
    if (this.useStaticData) {
      try {
        const staticInstruments = await staticDataService.getInstruments(tickers);

        if (staticInstruments.size > 0) {
          const map = new Map<string, FinnhubQuote>();

          staticInstruments.forEach((instrument, ticker) => {
            const quote: FinnhubQuote = {
              c: instrument.currentPrice,
              pc: instrument.previousClose,
              h: instrument.high || instrument.currentPrice,
              l: instrument.low || instrument.currentPrice,
              o: instrument.open || instrument.previousClose,
              t: Date.now(),
            };

            map.set(ticker, quote);

            // Cache for faster access
            this.cache.set(ticker, { data: quote, timestamp: Date.now() });
          });

          // If we got all tickers from static data, return immediately
          if (map.size === tickers.length) {
            return map;
          }

          // Otherwise, fetch missing tickers from API
          const missingTickers = tickers.filter(t => !map.has(t));
          if (missingTickers.length > 0) {
            const apiResults = await this.fetchBatchFromAPI(missingTickers);
            apiResults.forEach((quote, ticker) => map.set(ticker, quote));
          }

          return map;
        }
      } catch (error) {
        console.warn('Static data batch fetch failed, falling back to API');
      }
    }

    // Fallback to individual API calls
    return this.fetchBatchFromAPI(tickers);
  }

  /**
   * Fetch batch from API (fallback method)
   */
  private async fetchBatchFromAPI(tickers: string[]): Promise<Map<string, FinnhubQuote>> {
    const promises = tickers.map((ticker) =>
      this.fetchQuote(ticker).catch((err) => {
        console.error(`Failed to fetch ${ticker}:`, err);
        return null;
      })
    );

    const results = await Promise.allSettled(promises);
    const map = new Map<string, FinnhubQuote>();

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        map.set(tickers[index], result.value);
      }
    });

    return map;
  }

  /**
   * Get comprehensive service status for monitoring
   */
  async getStatus() {
    const staticMetadata = await staticDataService.getMetadata();

    return {
      dataSource: this.useStaticData ? 'static' : 'api',
      staticData: staticMetadata,
      finnhub: this.finnhubLimiter.getStatus(),
      twelve: this.twelveLimiter.getStatus(),
      cacheSize: this.cache.size,
    };
  }

  /**
   * Enable or disable static data source
   */
  setUseStaticData(enabled: boolean) {
    this.useStaticData = enabled;
  }

  /**
   * Clear all caches (useful for testing or forced refresh)
   */
  async clearCache() {
    this.cache.clear();
    localStorageCache.clear();
    await indexedDBCache.clear();
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStats() {
    const localStats = localStorageCache.getStats();
    const indexedStats = await indexedDBCache.getStats();

    return {
      memory: {
        entries: this.cache.size,
        estimatedSize: this.cache.size * 200, // Rough estimate
      },
      localStorage: localStats,
      indexedDB: indexedStats,
    };
  }

  /**
   * Handle API errors and convert to user-friendly format
   */
  private handleError(err: unknown, ticker?: string): APIError {
    const error = err as Error;

    if (error.message.includes('429')) {
      return {
        type: 'RATE_LIMIT',
        message: 'Too many requests. Please wait a moment.',
        ticker,
      };
    }

    if (error.message.includes('401') || error.message.includes('403')) {
      return {
        type: 'API_KEY',
        message: 'Invalid API key. Please check configuration.',
        ticker,
      };
    }

    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
      return {
        type: 'NETWORK',
        message: 'Unable to reach market data servers.',
        ticker,
      };
    }

    return {
      type: 'UNKNOWN',
      message: error.message || 'An unknown error occurred',
      ticker,
    };
  }
}

export const marketDataService = new MarketDataService();
