/**
 * Moving Average Service
 * Fetches historical data and calculates 50-day and 200-day moving averages
 * Uses Yahoo Finance API (free, no key required)
 */

import { MovingAverageData } from '@/types/marketCompass';

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
 * Calculate simple moving average from price array
 */
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const recentPrices = prices.slice(-period);
  const sum = recentPrices.reduce((acc, price) => acc + price, 0);
  return sum / period;
}

/**
 * Fetch historical data and calculate moving averages for a ticker
 */
export async function fetchMovingAverages(ticker: string): Promise<MovingAverageData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data: YahooChartResponse = await response.json();
    const result = data.chart.result[0];

    if (!result) {
      throw new Error(`No data returned for ${ticker}`);
    }

    const currentPrice = result.meta.regularMarketPrice;
    const closePrices = result.indicators.quote[0].close.filter((p) => p !== null);

    // Calculate moving averages
    const ma50 = calculateSMA(closePrices, 50);
    const ma200 = calculateSMA(closePrices, 200);

    // Calculate percentage distance from MAs
    const percentVs50MA = ((currentPrice - ma50) / ma50) * 100;
    const percentVs200MA = ((currentPrice - ma200) / ma200) * 100;

    return {
      ticker,
      currentPrice,
      ma50,
      ma200,
      percentVs50MA,
      percentVs200MA,
    };
  } catch (error) {
    console.error(`Failed to fetch moving averages for ${ticker}:`, error);
    throw error;
  }
}

/**
 * Fetch moving averages for multiple tickers in parallel
 */
export async function fetchMultipleMovingAverages(
  tickers: string[]
): Promise<Map<string, MovingAverageData>> {
  const promises = tickers.map(async (ticker) => {
    try {
      const data = await fetchMovingAverages(ticker);
      return [ticker, data] as const;
    } catch (error) {
      console.error(`Failed to fetch ${ticker}, using fallback`);
      // Return fallback data
      return [
        ticker,
        {
          ticker,
          currentPrice: 0,
          ma50: 0,
          ma200: 0,
          percentVs50MA: 0,
          percentVs200MA: 0,
        },
      ] as const;
    }
  });

  const results = await Promise.all(promises);
  return new Map(results);
}

/**
 * Calculate daily change percentage from historical data
 */
export function calculateDailyChange(prices: number[]): number {
  if (prices.length < 2) return 0;
  const current = prices[prices.length - 1];
  const previous = prices[prices.length - 2];
  return ((current - previous) / previous) * 100;
}
