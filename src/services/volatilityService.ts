/**
 * Volatility Metrics Service
 * Fetches VIX, put/call ratio, and VIX term structure
 */

import { COMPASS_API_CONFIG } from '@/config/compassApiConfig';
import { calculateDailyChange } from './movingAverageService';

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
      };
      indicators: {
        quote: Array<{
          close: number[];
        }>;
      };
    }>;
  };
}

/**
 * Fetch VIX data
 * Uses existing Finnhub integration if available, falls back to Yahoo Finance
 */
async function fetchVIX(): Promise<{ value: number; dailyChange: number }> {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch VIX data');
    }

    const data: YahooChartResponse = await response.json();
    const result = data.chart.result[0];
    const value = result.meta.regularMarketPrice;
    const closes = result.indicators.quote[0].close.filter((p) => p !== null);
    const dailyChange = calculateDailyChange(closes);

    return { value, dailyChange };
  } catch (error) {
    console.error('Failed to fetch VIX, using fallback:', error);
    return {
      value: COMPASS_API_CONFIG.volatility.fallback.vix,
      dailyChange: 0,
    };
  }
}

/**
 * Fetch VIX term structure to determine contango vs backwardation
 * Contango = VIX3M > VIX (normal, healthy market)
 * Backwardation = VIX > VIX3M (panic, stressed market)
 */
async function fetchVIXTermStructure(): Promise<boolean> {
  try {
    const [vixResponse, vix3mResponse] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d'),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX3M?interval=1d&range=1d'),
    ]);

    if (!vixResponse.ok || !vix3mResponse.ok) {
      throw new Error('Failed to fetch VIX term structure');
    }

    const vixData: YahooChartResponse = await vixResponse.json();
    const vix3mData: YahooChartResponse = await vix3mResponse.json();

    const vix = vixData.chart.result[0].meta.regularMarketPrice;
    const vix3m = vix3mData.chart.result[0].meta.regularMarketPrice;

    // Contango = VIX3M > VIX (return true)
    // Backwardation = VIX > VIX3M (return false)
    return vix3m > vix;
  } catch (error) {
    console.error('Failed to fetch VIX term structure, using fallback:', error);
    return COMPASS_API_CONFIG.volatility.fallback.isContango;
  }
}

/**
 * Fetch CBOE Put/Call Ratio
 * Uses CBOE Equity Put/Call Ratio (^PCCE)
 */
async function fetchPutCallRatio(): Promise<{ ratio: number; change: number }> {
  try {
    const url =
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EPCCE?interval=1d&range=5d';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch put/call ratio');
    }

    const data: YahooChartResponse = await response.json();
    const result = data.chart.result[0];
    const ratio = result.meta.regularMarketPrice;
    const closes = result.indicators.quote[0].close.filter((p) => p !== null);
    const change = calculateDailyChange(closes);

    return { ratio, change };
  } catch (error) {
    console.error('Failed to fetch put/call ratio, using fallback:', error);
    return {
      ratio: COMPASS_API_CONFIG.volatility.fallback.putCallRatio,
      change: 0,
    };
  }
}

/**
 * Fetch all volatility metrics
 */
export async function fetchVolatilityMetrics(): Promise<{
  vix: {
    value: number;
    dailyChange: number;
    isContango: boolean;
  };
  putCall: {
    ratio: number;
    change: number;
  };
}> {
  try {
    const [vixData, isContango, putCallData] = await Promise.all([
      fetchVIX(),
      fetchVIXTermStructure(),
      fetchPutCallRatio(),
    ]);

    return {
      vix: {
        value: vixData.value,
        dailyChange: vixData.dailyChange,
        isContango,
      },
      putCall: {
        ratio: putCallData.ratio,
        change: putCallData.change,
      },
    };
  } catch (error) {
    console.error('Failed to fetch volatility metrics, using fallback:', error);
    return {
      vix: {
        value: COMPASS_API_CONFIG.volatility.fallback.vix,
        dailyChange: 0,
        isContango: COMPASS_API_CONFIG.volatility.fallback.isContango,
      },
      putCall: {
        ratio: COMPASS_API_CONFIG.volatility.fallback.putCallRatio,
        change: 0,
      },
    };
  }
}
