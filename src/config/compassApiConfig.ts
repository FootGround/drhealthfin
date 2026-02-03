/**
 * Market Compass V6 - Free API Endpoint Mapping
 *
 * Maps all 18 signals to free data sources with fallback strategies
 * Update frequencies optimized for free tier limits
 */

export const COMPASS_API_CONFIG = {
  // ============================================================================
  // DIRECTION PILLAR - 3 signals (SPY, QQQ, IWM vs 200MA)
  // ============================================================================
  direction: {
    // Use existing Finnhub for prices + Yahoo Finance for moving averages
    sources: {
      prices: 'finnhub', // Already integrated
      movingAverages: 'yahoo-finance', // Free, unofficial API
    },
    tickers: ['SPY', 'QQQ', 'IWM'],
    updateFrequency: 15000, // 15s during market hours (existing)
    endpoints: {
      yahooFinance: 'https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1y',
    },
  },

  // ============================================================================
  // BREADTH PILLAR - 3 signals
  // ============================================================================
  breadth: {
    sources: {
      advanceDecline: 'yahoo-finance', // NYSE advance/decline
      percentAbove200MA: 'alpha-vantage', // Calculate from S&P 500 components
      newHighsLows: 'yahoo-finance', // NYSE new highs/lows
    },
    updateFrequency: 60000, // 1 minute (these update less frequently)
    endpoints: {
      // Advance/Decline Line
      advanceDecline: 'https://query1.finance.yahoo.com/v8/finance/chart/%5ENYAD?interval=1d&range=1d',
      // New Highs/Lows - scrape from Yahoo Finance market summary
      newHighsLows: 'https://finance.yahoo.com/markets/', // Requires HTML parsing fallback
      // For % above 200MA: calculate from SPY holdings (top 50 stocks as proxy)
      sp500Components: 'https://www.slickcharts.com/sp500', // Fallback: use simplified calculation
    },
    fallback: {
      // If live data unavailable, use reasonable approximations
      advancers: 1800,
      decliners: 1200,
      percentAbove200MA: 60,
      percentAbove200MAChange: 0,
      newHighs: 75,
      newLows: 30,
    },
  },

  // ============================================================================
  // VOLATILITY PILLAR - 3 signals (VIX, Put/Call, Term Structure)
  // ============================================================================
  volatility: {
    sources: {
      vix: 'finnhub', // Already have VIXY ticker
      putCall: 'yahoo-finance', // CBOE put/call ratio
      termStructure: 'yahoo-finance', // Compare VIX front month vs VIX3M
    },
    updateFrequency: 30000, // 30s
    endpoints: {
      vix: 'finnhub', // Use existing integration
      putCallRatio: 'https://query1.finance.yahoo.com/v8/finance/chart/^PCCE?interval=1d&range=5d', // CBOE equity put/call
      vixFrontMonth: 'https://query1.finance.yahoo.com/v8/finance/chart/^VIX?interval=1d&range=5d',
      vix3Month: 'https://query1.finance.yahoo.com/v8/finance/chart/^VIX3M?interval=1d&range=5d',
    },
    fallback: {
      vix: 18.0,
      putCallRatio: 0.85,
      isContango: true,
    },
  },

  // ============================================================================
  // CREDIT PILLAR - 3 signals (Yield Curve, HY Spread, IG Spread)
  // ============================================================================
  credit: {
    sources: {
      yieldCurve: 'fred', // Federal Reserve Economic Data (free, reliable)
      hySpread: 'fred', // High yield OAS
      igSpread: 'fred', // IG OAS
    },
    updateFrequency: 300000, // 5 minutes (updates once daily, no need to poll frequently)
    endpoints: {
      // FRED API - requires free API key
      treasury10Y: 'https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key={key}&file_type=json&limit=1&sort_order=desc',
      treasury2Y: 'https://api.stlouisfed.org/fred/series/observations?series_id=DGS2&api_key={key}&file_type=json&limit=1&sort_order=desc',
      hySpread: 'https://api.stlouisfed.org/fred/series/observations?series_id=BAMLH0A0HYM2&api_key={key}&file_type=json&limit=1&sort_order=desc',
      igSpread: 'https://api.stlouisfed.org/fred/series/observations?series_id=BAMLC0A4CBBB&api_key={key}&file_type=json&limit=1&sort_order=desc',
    },
    fallback: {
      yieldCurveSpread: 0.35,
      hySpread: 3.5,
      igSpread: 1.2,
    },
  },

  // ============================================================================
  // SENTIMENT PILLAR - 3 signals (AAII Bulls, AAII Bears, Fear & Greed)
  // ============================================================================
  sentiment: {
    sources: {
      aaii: 'aaii-scrape', // AAII publishes weekly, scrape from their site
      fearGreed: 'cnn-api', // CNN Fear & Greed has unofficial API
    },
    updateFrequency: 3600000, // 1 hour (AAII updates weekly, F&G updates daily)
    endpoints: {
      // AAII Sentiment Survey (weekly)
      aaii: 'https://www.aaii.com/sentimentsurvey', // Requires scraping HTML
      // CNN Fear & Greed Index (alternative endpoint)
      fearGreed: 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata', // Unofficial but stable
    },
    fallback: {
      bulls: 35.0,
      bears: 30.0,
      bullsChange: 0,
      bearsChange: 0,
      fearGreed: 50,
      fearGreedChange: 0,
    },
  },

  // ============================================================================
  // GLOBAL PILLAR - 3 signals (ACWI, VSTOXX, PMI)
  // ============================================================================
  global: {
    sources: {
      acwi: 'yahoo-finance', // ACWI ETF
      vstoxx: 'yahoo-finance', // VSTOXX index (European VIX)
      pmi: 'static', // PMI updates monthly, use latest known value
    },
    updateFrequency: 60000, // 1 minute for ACWI/VSTOXX, PMI is static until monthly update
    endpoints: {
      acwi: 'https://query1.finance.yahoo.com/v8/finance/chart/ACWI?interval=1d&range=3mo',
      vstoxx: 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVSTOXX?interval=1d&range=5d',
      // PMI: Use static values, update manually monthly or scrape from Trading Economics
      pmi: 'static', // Fallback: 52.0
    },
    fallback: {
      acwi: { price: 110.0, percentVs50MA: 1.0, dailyChange: 0.0 },
      vstoxx: { value: 17.0, change: 0.0 },
      pmi: { value: 52.0, change: 0.0 },
    },
  },
} as const;

// ============================================================================
// API KEYS CONFIGURATION
// ============================================================================

export const COMPASS_API_KEYS = {
  fred: import.meta.env.VITE_FRED_API_KEY || '', // Free from https://fred.stlouisfed.org/docs/api/api_key.html
  // Yahoo Finance and CNN don't require API keys (unofficial public endpoints)
} as const;

// ============================================================================
// UPDATE STRATEGY
// ============================================================================

export const UPDATE_STRATEGY = {
  // Real-time during market hours (15s-30s)
  realtime: ['direction', 'volatility'],

  // Frequent but not real-time (1-5 min)
  frequent: ['breadth', 'global'],

  // Infrequent - daily/weekly updates (1 hour)
  infrequent: ['credit', 'sentiment'],

  // Adjust frequencies based on market hours
  marketHours: {
    open: 'use configured frequencies',
    closed: 'multiply all by 10x',
  },
} as const;

// ============================================================================
// DATA QUALITY THRESHOLDS
// ============================================================================

export const DATA_QUALITY = {
  // Maximum age before data is considered stale (milliseconds)
  maxAge: {
    realtime: 60000, // 1 minute
    frequent: 300000, // 5 minutes
    infrequent: 86400000, // 24 hours
  },

  // Minimum required signals for each pillar to show score
  minSignalsPerPillar: 2, // Show pillar if at least 2/3 signals available

  // Show warning if more than this many signals missing
  warningThreshold: 6, // Warn if more than 6/18 signals missing
} as const;
