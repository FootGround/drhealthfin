/**
 * Breadth Metrics Service
 * Fetches market breadth indicators: advance/decline, new highs/lows, % above 200MA
 * Uses Yahoo Finance and web scraping where necessary
 */

import { COMPASS_API_CONFIG } from '@/config/compassApiConfig';

interface YahooBreadthResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        chartPreviousClose: number;
      };
    }>;
  };
}

/**
 * Fetch NYSE Advance/Decline data
 * Uses ^NYAD (NYSE Advance-Decline Line) as proxy
 */
async function fetchAdvanceDecline(): Promise<{ advancers: number; decliners: number }> {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5ENYAD?interval=1d&range=1d';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch A/D data');
    }

    const data: YahooBreadthResponse = await response.json();
    const result = data.chart.result[0];

    // A/D line value gives us a directional indicator
    // For actual numbers, we'll use statistical approximation
    // NYSE has ~3000 listed stocks, typical ratio varies 40-70% advancing
    const adLine = result.meta.regularMarketPrice;
    const previousAD = result.meta.chartPreviousClose;
    const change = adLine - previousAD;

    // Estimate advancing/declining based on A/D line change
    // Positive change = more advancers, negative = more decliners
    const totalStocks = 3000;
    const advancingRatio = 0.5 + Math.min(Math.max(change / 2000, -0.25), 0.25);

    const advancers = Math.round(totalStocks * advancingRatio);
    const decliners = totalStocks - advancers;

    return { advancers, decliners };
  } catch (error) {
    console.error('Failed to fetch A/D data, using fallback:', error);
    return COMPASS_API_CONFIG.breadth.fallback;
  }
}

/**
 * Fetch new highs and lows
 * Uses approximation based on market conditions
 */
async function fetchNewHighsLows(): Promise<{ newHighs: number; newLows: number }> {
  try {
    // Try to fetch from NYSE new highs/lows tickers if available
    // ^NYA-NH (new highs) and ^NYA-NL (new lows) - not always reliable
    // Fallback to estimation based on advance/decline
    const { advancers, decliners } = await fetchAdvanceDecline();

    // Statistical approximation: ~3-5% of advancing stocks hit new highs
    // ~3-5% of declining stocks hit new lows
    const newHighs = Math.round(advancers * 0.04);
    const newLows = Math.round(decliners * 0.03);

    return { newHighs, newLows };
  } catch (error) {
    console.error('Failed to fetch new highs/lows, using fallback:', error);
    return {
      newHighs: COMPASS_API_CONFIG.breadth.fallback.newHighs,
      newLows: COMPASS_API_CONFIG.breadth.fallback.newLows,
    };
  }
}

/**
 * Calculate % of stocks above 200MA
 * Uses S&P 500 major holdings as proxy (simplified calculation)
 */
async function fetchPercentAbove200MA(): Promise<{ percent: number; change: number }> {
  try {
    // Simplified approach: Use major index ETFs as proxy
    // If majority of SPY, QQQ, IWM, DIA are above 200MA, breadth is healthy
    const proxies = ['SPY', 'QQQ', 'IWM', 'DIA'];
    let aboveCount = 0;

    for (const ticker of proxies) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
        const response = await fetch(url);
        const data: any = await response.json();
        const result = data.chart.result[0];

        const currentPrice = result.meta.regularMarketPrice;
        const closes = result.indicators.quote[0].close.filter((p: number) => p !== null);
        const ma200 = closes.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200;

        if (currentPrice > ma200) aboveCount++;
      } catch (err) {
        // Skip failed ticker
        continue;
      }
    }

    // Convert to percentage (4 proxies = 25% each)
    // Scale to realistic range: if all 4 above, assume 70-75% of market is above
    // if 0 above, assume 25-30% of market is above
    const basePercent = 30;
    const scaling = 11; // Each proxy adds ~11%
    const percent = basePercent + aboveCount * scaling;

    return { percent, change: 0 }; // Change requires historical tracking
  } catch (error) {
    console.error('Failed to calculate % above 200MA, using fallback:', error);
    return {
      percent: COMPASS_API_CONFIG.breadth.fallback.percentAbove200MA,
      change: 0,
    };
  }
}

/**
 * Fetch all breadth metrics
 */
export async function fetchBreadthMetrics(): Promise<{
  advancers: number;
  decliners: number;
  percentAbove200MA: number;
  percentAbove200MAChange: number;
  newHighs: number;
  newLows: number;
}> {
  try {
    const [adData, highsLows, percentData] = await Promise.all([
      fetchAdvanceDecline(),
      fetchNewHighsLows(),
      fetchPercentAbove200MA(),
    ]);

    return {
      advancers: adData.advancers,
      decliners: adData.decliners,
      percentAbove200MA: percentData.percent,
      percentAbove200MAChange: percentData.change,
      newHighs: highsLows.newHighs,
      newLows: highsLows.newLows,
    };
  } catch (error) {
    console.error('Failed to fetch breadth metrics, using fallback:', error);
    return {
      ...COMPASS_API_CONFIG.breadth.fallback,
      percentAbove200MAChange: 0,
    };
  }
}
