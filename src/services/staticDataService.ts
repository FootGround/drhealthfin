/**
 * Static Data Service
 *
 * Fetches pre-generated market data from GitHub Actions.
 * This is the primary data source - API calls are fallback only.
 *
 * Benefits:
 * - No API keys exposed to clients
 * - Instant page load (no API latency)
 * - No rate limit concerns
 * - Works offline (with cached data)
 */

interface StaticMarketData {
  lastUpdated: string;
  marketOpen: boolean;
  instruments: Record<string, {
    ticker: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    previousClose: number;
    high?: number;
    low?: number;
    open?: number;
    sparkline?: number[];
  }>;
}

class StaticDataService {
  private cache: StaticMarketData | null = null;
  private fetchPromise: Promise<StaticMarketData> | null = null;

  /**
   * Fetch market data from static JSON file
   * Uses in-memory cache to avoid repeated fetches
   */
  async fetchMarketData(): Promise<StaticMarketData> {
    // Return cached data if available
    if (this.cache) {
      return this.cache;
    }

    // Return existing fetch promise if already fetching
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Fetch from static file
    this.fetchPromise = this.fetchFromStatic();

    try {
      const data = await this.fetchPromise;
      this.cache = data;
      return data;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Fetch from public/market-data.json
   */
  private async fetchFromStatic(): Promise<StaticMarketData> {
    try {
      // Add cache busting query param to avoid stale browser cache
      const timestamp = Math.floor(Date.now() / (5 * 60 * 1000)); // Update every 5 minutes
      const response = await fetch(`/market-data.json?t=${timestamp}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch market data: ${response.status}`);
      }

      const data = await response.json();

      // Validate data structure
      if (!data.instruments || typeof data.instruments !== 'object') {
        throw new Error('Invalid market data format');
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch static market data:', error);

      // Return empty data structure if fetch fails
      return {
        lastUpdated: new Date().toISOString(),
        marketOpen: false,
        instruments: {},
      };
    }
  }

  /**
   * Get data for a specific ticker
   */
  async getInstrument(ticker: string) {
    const data = await this.fetchMarketData();
    return data.instruments[ticker] || null;
  }

  /**
   * Get data for multiple tickers
   */
  async getInstruments(tickers: string[]) {
    const data = await this.fetchMarketData();
    const results = new Map();

    tickers.forEach(ticker => {
      const instrument = data.instruments[ticker];
      if (instrument) {
        results.set(ticker, instrument);
      }
    });

    return results;
  }

  /**
   * Check if data is stale (older than 20 minutes)
   */
  async isDataStale(): Promise<boolean> {
    if (!this.cache) return true;

    const age = Date.now() - new Date(this.cache.lastUpdated).getTime();
    return age > 20 * 60 * 1000; // 20 minutes
  }

  /**
   * Force refresh data from server
   */
  async refresh(): Promise<StaticMarketData> {
    this.cache = null;
    return this.fetchMarketData();
  }

  /**
   * Get metadata about the data
   */
  async getMetadata() {
    const data = await this.fetchMarketData();

    return {
      lastUpdated: data.lastUpdated,
      marketOpen: data.marketOpen,
      instrumentCount: Object.keys(data.instruments).length,
      age: Date.now() - new Date(data.lastUpdated).getTime(),
    };
  }
}

// Export singleton instance
export const staticDataService = new StaticDataService();
