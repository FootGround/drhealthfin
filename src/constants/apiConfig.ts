export const API_CONFIG = {
  finnhub: {
    baseUrl: 'https://finnhub.io/api/v1',
    apiKey: import.meta.env.VITE_FINNHUB_API_KEY || '',
    rateLimit: {
      callsPerMinute: 60,
      safeLimit: 55, // Buffer
    },
  },
  twelveData: {
    baseUrl: 'https://api.twelvedata.com',
    apiKey: import.meta.env.VITE_TWELVE_DATA_API_KEY || '',
    rateLimit: {
      callsPerDay: 800,
      callsPerMinute: 8,
    },
  },
} as const;

export const CACHE_TTL = 15000; // 15 seconds

export const UPDATE_INTERVALS = {
  tier1: 15000, // 15 seconds
  standard: 60000, // 60 seconds
  afterHours: {
    tier1: 300000, // 5 minutes
    standard: 600000, // 10 minutes
  },
} as const;

export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
} as const;
