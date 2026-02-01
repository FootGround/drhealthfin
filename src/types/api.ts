// Finnhub API Response Types
export interface FinnhubQuote {
  c: number; // Current price
  h: number; // High
  l: number; // Low
  o: number; // Open
  pc: number; // Previous close
  t: number; // Timestamp
}

// Twelve Data API Response Types
export interface TwelveDataValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}

export interface TwelveDataResponse {
  meta: {
    symbol: string;
    interval: string;
    currency?: string;
    exchange_timezone?: string;
    exchange?: string;
    type?: string;
  };
  values: TwelveDataValue[];
  status: string;
}

// API Error Types
export interface APIError {
  type: 'RATE_LIMIT' | 'NETWORK' | 'API_KEY' | 'UNKNOWN';
  message: string;
  ticker?: string;
}

// Cache Entry
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
