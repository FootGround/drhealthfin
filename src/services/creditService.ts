/**
 * Credit Metrics Service
 * Fetches yield curve and credit spreads from FRED (Federal Reserve Economic Data)
 * Requires free FRED API key: https://fred.stlouisfed.org/docs/api/api_key.html
 */

import { COMPASS_API_KEYS, COMPASS_API_CONFIG } from '@/config/compassApiConfig';

interface FREDResponse {
  observations: Array<{
    date: string;
    value: string; // FRED returns numbers as strings
  }>;
}

/**
 * Fetch data from FRED API
 */
async function fetchFREDData(seriesId: string): Promise<number> {
  const apiKey = COMPASS_API_KEYS.fred;

  if (!apiKey) {
    console.warn('FRED API key not configured, using fallback data');
    throw new Error('FRED API key missing');
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=2&sort_order=desc`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data: FREDResponse = await response.json();

    if (!data.observations || data.observations.length === 0) {
      throw new Error('No data returned from FRED');
    }

    // Get most recent non-null value
    for (const obs of data.observations) {
      const value = parseFloat(obs.value);
      if (!isNaN(value) && obs.value !== '.') {
        return value;
      }
    }

    throw new Error('No valid data points found');
  } catch (error) {
    console.error(`Failed to fetch FRED series ${seriesId}:`, error);
    throw error;
  }
}

/**
 * Calculate yield curve spread (10Y - 2Y)
 */
async function fetchYieldCurve(): Promise<{ spread: number; change: number }> {
  try {
    const [treasury10Y, treasury2Y] = await Promise.all([
      fetchFREDData('DGS10'), // 10-Year Treasury
      fetchFREDData('DGS2'), // 2-Year Treasury
    ]);

    const spread = treasury10Y - treasury2Y;

    return { spread, change: 0 }; // Change requires historical tracking
  } catch (error) {
    console.error('Failed to fetch yield curve, using fallback:', error);
    return {
      spread: COMPASS_API_CONFIG.credit.fallback.yieldCurveSpread,
      change: 0,
    };
  }
}

/**
 * Fetch High Yield (junk bond) spread
 * Series: BAMLH0A0HYM2 (ICE BofA US High Yield Index Option-Adjusted Spread)
 */
async function fetchHighYieldSpread(): Promise<{ spread: number; change: number }> {
  try {
    const spread = await fetchFREDData('BAMLH0A0HYM2');
    return { spread, change: 0 };
  } catch (error) {
    console.error('Failed to fetch HY spread, using fallback:', error);
    return {
      spread: COMPASS_API_CONFIG.credit.fallback.hySpread,
      change: 0,
    };
  }
}

/**
 * Fetch Investment Grade spread
 * Series: BAMLC0A4CBBB (ICE BofA BBB US Corporate Index Option-Adjusted Spread)
 */
async function fetchInvestmentGradeSpread(): Promise<{ spread: number; change: number }> {
  try {
    const spread = await fetchFREDData('BAMLC0A4CBBB');
    return { spread, change: 0 };
  } catch (error) {
    console.error('Failed to fetch IG spread, using fallback:', error);
    return {
      spread: COMPASS_API_CONFIG.credit.fallback.igSpread,
      change: 0,
    };
  }
}

/**
 * Fetch all credit metrics
 */
export async function fetchCreditMetrics(): Promise<{
  yieldCurve: { spread: number; change: number };
  hySpread: number;
  hySpreadChange: number;
  igSpread: number;
  igSpreadChange: number;
}> {
  try {
    const [yieldCurve, hyData, igData] = await Promise.all([
      fetchYieldCurve(),
      fetchHighYieldSpread(),
      fetchInvestmentGradeSpread(),
    ]);

    return {
      yieldCurve,
      hySpread: hyData.spread,
      hySpreadChange: hyData.change,
      igSpread: igData.spread,
      igSpreadChange: igData.change,
    };
  } catch (error) {
    console.error('Failed to fetch credit metrics, using fallback:', error);
    return {
      yieldCurve: {
        spread: COMPASS_API_CONFIG.credit.fallback.yieldCurveSpread,
        change: 0,
      },
      hySpread: COMPASS_API_CONFIG.credit.fallback.hySpread,
      hySpreadChange: 0,
      igSpread: COMPASS_API_CONFIG.credit.fallback.igSpread,
      igSpreadChange: 0,
    };
  }
}
