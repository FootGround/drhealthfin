/**
 * Global Metrics Service
 * Fetches international market indicators: ACWI, VSTOXX, Global PMI
 */

import { COMPASS_API_CONFIG } from '@/config/compassApiConfig';
import { calculateDailyChange } from './movingAverageService';

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: number[];
        }>;
      };
    }>;
  };
}

/**
 * Fetch ACWI (MSCI All Country World Index) data with moving average
 */
async function fetchACWI(): Promise<{
  price: number;
  percentVs50MA: number;
  dailyChange: number;
}> {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/ACWI?interval=1d&range=3mo';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch ACWI data');
    }

    const data: YahooChartResponse = await response.json();
    const result = data.chart.result[0];
    const price = result.meta.regularMarketPrice;
    const closes = result.indicators.quote[0].close.filter((p) => p !== null);

    // Calculate 50-day MA
    const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
    const percentVs50MA = ((price - ma50) / ma50) * 100;
    const dailyChange = calculateDailyChange(closes);

    return { price, percentVs50MA, dailyChange };
  } catch (error) {
    console.error('Failed to fetch ACWI, using fallback:', error);
    return COMPASS_API_CONFIG.global.fallback.acwi;
  }
}

/**
 * Fetch VSTOXX (European volatility index)
 */
async function fetchVSTOXX(): Promise<{ value: number; change: number }> {
  try {
    const url =
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVSTOXX?interval=1d&range=5d';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch VSTOXX data');
    }

    const data: YahooChartResponse = await response.json();
    const result = data.chart.result[0];
    const value = result.meta.regularMarketPrice;
    const closes = result.indicators.quote[0].close.filter((p) => p !== null);
    const change = calculateDailyChange(closes);

    return { value, change };
  } catch (error) {
    console.error('Failed to fetch VSTOXX, using fallback:', error);
    return COMPASS_API_CONFIG.global.fallback.vstoxx;
  }
}

/**
 * Fetch Global PMI (Purchasing Managers Index)
 * PMI updates monthly, so we use static values updated manually
 * Consider fetching from Trading Economics or S&P Global for real-time data
 */
async function fetchGlobalPMI(): Promise<{ value: number; change: number }> {
  try {
    // Check for static PMI data file
    const response = await fetch('/data/global-pmi.json');

    if (!response.ok) {
      throw new Error('PMI data file not found');
    }

    const data = await response.json();
    return {
      value: data.value || COMPASS_API_CONFIG.global.fallback.pmi.value,
      change: data.change || 0,
    };
  } catch (error) {
    console.warn('Failed to fetch PMI, using fallback:', error);
    return COMPASS_API_CONFIG.global.fallback.pmi;
  }
}

/**
 * Fetch all global metrics
 */
export async function fetchGlobalMetrics(): Promise<{
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
}> {
  try {
    const [acwi, vstoxx, pmi] = await Promise.all([
      fetchACWI(),
      fetchVSTOXX(),
      fetchGlobalPMI(),
    ]);

    return { acwi, vstoxx, pmi };
  } catch (error) {
    console.error('Failed to fetch global metrics, using fallback:', error);
    return COMPASS_API_CONFIG.global.fallback;
  }
}
