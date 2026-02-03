/**
 * Market Compass V6 Data Types
 * Complete type definitions for all 18 signals across 6 pillars
 */

// ============================================================================
// RAW DATA STRUCTURE - What we fetch from APIs
// ============================================================================

export interface MarketCompassRawData {
  // Direction pillar (3 signals)
  spy: {
    price: number;
    percentVs200MA: number;
    dailyChange: number;
  };
  qqq: {
    price: number;
    percentVs200MA: number;
    dailyChange: number;
  };
  iwm: {
    price: number;
    percentVs200MA: number;
    dailyChange: number;
  };

  // Breadth pillar (3 signals)
  breadth: {
    advancers: number;
    decliners: number;
    percentAbove200MA: number;
    percentAbove200MAChange: number;
    newHighs: number;
    newLows: number;
  };

  // Volatility pillar (3 signals)
  vix: {
    value: number;
    dailyChange: number;
    isContango: boolean; // term structure
  };
  putCall: {
    ratio: number;
    change: number;
  };

  // Credit pillar (3 signals)
  yieldCurve: {
    spread: number; // 10Y-2Y spread in percentage points
    change: number;
  };
  credit: {
    hySpread: number; // High yield spread
    hySpreadChange: number;
    igSpread: number; // Investment grade spread
    igSpreadChange: number;
  };

  // Sentiment pillar (3 signals)
  sentiment: {
    bulls: number; // AAII bulls %
    bullsChange: number;
    bears: number; // AAII bears %
    bearsChange: number;
    fearGreed: number; // CNN Fear & Greed Index (0-100)
    fearGreedChange: number;
  };

  // Global pillar (3 signals)
  global: {
    acwi: {
      price: number;
      percentVs50MA: number;
      dailyChange: number;
    };
    vstoxx: {
      value: number;
      change: number;
    };
    pmi: {
      value: number;
      change: number;
    };
  };

  // Metadata
  updatedAt: string;
  marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours';
}

// ============================================================================
// SIGNAL DEFINITION - Individual signals within pillars
// ============================================================================

export interface Signal {
  name: string;
  ticker: string;
  rawValue: number | boolean;
  displayValue: string;
  change: number | null;
  score: number; // 0-100
  threshold: string;
}

// ============================================================================
// PILLAR DEFINITION - Collections of signals
// ============================================================================

export interface Pillar {
  weight: number; // 0-1, total must equal 1
  signals: Signal[];
  score: number; // 0-100, calculated as average of signal scores
}

export type PillarKey = 'direction' | 'breadth' | 'volatility' | 'credit' | 'sentiment' | 'global';

export interface Pillars {
  direction: Pillar;
  breadth: Pillar;
  volatility: Pillar;
  credit: Pillar;
  sentiment: Pillar;
  global: Pillar;
}

// ============================================================================
// API RESPONSE TYPES - What we get from external services
// ============================================================================

export interface FREDDataPoint {
  date: string;
  value: number;
}

export interface YahooQuote {
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
}

export interface AAIISentiment {
  bullish: number;
  bearish: number;
  neutral: number;
  date: string;
}

export interface FearGreedIndex {
  value: number;
  rating: string;
  previousValue: number;
}

export interface BreadthData {
  advancing: number;
  declining: number;
  unchanged: number;
  newHighs: number;
  newLows: number;
}

export interface PMIData {
  value: number;
  date: string;
}

// ============================================================================
// DATA STATUS - Track completeness and freshness
// ============================================================================

export interface DataStatus {
  isComplete: boolean;
  missingSignals: string[];
  lastUpdated: Date;
  staleDuration: number; // milliseconds since last update
}

// ============================================================================
// MOVING AVERAGE DATA - For calculating position vs MA
// ============================================================================

export interface MovingAverageData {
  ticker: string;
  currentPrice: number;
  ma50: number;
  ma200: number;
  percentVs50MA: number;
  percentVs200MA: number;
}
