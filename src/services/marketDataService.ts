import { API_CONFIG, CACHE_TTL } from '@/constants/apiConfig';
import { SYMBOL_MAP } from '@/constants/instruments';
import { FinnhubQuote, TwelveDataResponse, CacheEntry, APIError } from '@/types/api';
import { fetchWithRetry } from '@/utils/retryHelper';
import { RateLimiter } from './rateLimiter';

class MarketDataService {
  private cache = new Map<string, CacheEntry<FinnhubQuote>>();
  private finnhubLimiter: RateLimiter;
  private twelveLimiter: RateLimiter;

  constructor() {
    this.finnhubLimiter = new RateLimiter(API_CONFIG.finnhub.rateLimit.safeLimit);
    this.twelveLimiter = new RateLimiter(API_CONFIG.twelveData.rateLimit.callsPerMinute);
  }

  /**
   * Fetch real-time quote from Finnhub
   */
  async fetchQuote(ticker: string): Promise<FinnhubQuote> {
    // Check cache
    const cached = this.cache.get(ticker);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Get API symbol (handle special cases like ^VIX → VIX for Finnhub)
    const apiSymbol = SYMBOL_MAP[ticker] || ticker;

    return this.finnhubLimiter.execute(async () => {
      try {
        const url = `${API_CONFIG.finnhub.baseUrl}/quote?symbol=${apiSymbol}&token=${API_CONFIG.finnhub.apiKey}`;
        const data = await fetchWithRetry<FinnhubQuote>(url);

        // Cache the result
        this.cache.set(ticker, { data, timestamp: Date.now() });

        return data;
      } catch (err) {
        throw this.handleError(err, ticker);
      }
    });
  }

  /**
   * Fetch historical data from Twelve Data for sparklines
   */
  async fetchHistorical(
    ticker: string,
    interval: string = '5min',
    outputsize: number = 20
  ): Promise<number[]> {
    const apiSymbol = SYMBOL_MAP[ticker] || ticker;

    return this.twelveLimiter.execute(async () => {
      try {
        const url = `${API_CONFIG.twelveData.baseUrl}/time_series?symbol=${apiSymbol}&interval=${interval}&outputsize=${outputsize}&apikey=${API_CONFIG.twelveData.apiKey}`;
        const data = await fetchWithRetry<TwelveDataResponse>(url);

        if (!data.values || data.values.length === 0) {
          throw new Error(`No historical data available for ${ticker}`);
        }

        // Convert to array of closing prices
        return data.values.map((v) => parseFloat(v.close)).reverse();
      } catch (err) {
        throw this.handleError(err, ticker);
      }
    });
  }

  /**
   * Batch fetch multiple symbols
   */
  async fetchBatch(tickers: string[]): Promise<Map<string, FinnhubQuote>> {
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
   * Get rate limiter status for monitoring
   */
  getStatus() {
    return {
      finnhub: this.finnhubLimiter.getStatus(),
      twelve: this.twelveLimiter.getStatus(),
      cacheSize: this.cache.size,
    };
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache() {
    this.cache.clear();
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
