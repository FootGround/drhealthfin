/**
 * Sentiment Metrics Service
 * Fetches sentiment indicators: AAII bulls/bears, CNN Fear & Greed Index
 */

import { COMPASS_API_CONFIG } from '@/config/compassApiConfig';

interface FearGreedResponse {
  fear_and_greed: {
    score: number;
    rating: string;
    previous_close: number;
  };
}

/**
 * Fetch CNN Fear & Greed Index
 * Uses unofficial but stable endpoint
 */
async function fetchFearGreedIndex(): Promise<{ value: number; change: number }> {
  try {
    const url = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch Fear & Greed Index');
    }

    const data: FearGreedResponse = await response.json();
    const value = data.fear_and_greed.score;
    const previousValue = data.fear_and_greed.previous_close;
    const change = value - previousValue;

    return { value, change };
  } catch (error) {
    console.error('Failed to fetch Fear & Greed Index, using fallback:', error);
    return {
      value: COMPASS_API_CONFIG.sentiment.fallback.fearGreed,
      change: 0,
    };
  }
}

/**
 * Fetch AAII Sentiment Survey
 * AAII updates weekly (Thursday). Since they don't have a public API,
 * we'll use a simplified approach with fallback values.
 *
 * For production, consider:
 * 1. Manual weekly updates to a JSON file in your repo
 * 2. Web scraping service (requires backend proxy)
 * 3. Paid data provider
 */
async function fetchAAIISentiment(): Promise<{
  bulls: number;
  bears: number;
  bullsChange: number;
  bearsChange: number;
}> {
  try {
    // AAII doesn't have a free API
    // Options:
    // 1. Scrape from https://www.aaii.com/sentimentsurvey (requires CORS proxy)
    // 2. Use static JSON file updated manually weekly
    // 3. Use fallback values

    // For now, using reasonable fallback values
    // In production, implement weekly manual updates or scraping service
    throw new Error('AAII API not available');
  } catch (error) {
    console.warn('AAII data unavailable, using typical values:', error);
    return {
      bulls: COMPASS_API_CONFIG.sentiment.fallback.bulls,
      bears: COMPASS_API_CONFIG.sentiment.fallback.bears,
      bullsChange: 0,
      bearsChange: 0,
    };
  }
}

/**
 * Attempt to fetch AAII data from a static JSON file
 * This allows manual weekly updates without API dependency
 */
async function fetchAAIIFromStatic(): Promise<{
  bulls: number;
  bears: number;
  bullsChange: number;
  bearsChange: number;
} | null> {
  try {
    // Check if static AAII data file exists in public folder
    const response = await fetch('/data/aaii-sentiment.json');

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      bulls: data.bullish || COMPASS_API_CONFIG.sentiment.fallback.bulls,
      bears: data.bearish || COMPASS_API_CONFIG.sentiment.fallback.bears,
      bullsChange: data.bullishChange || 0,
      bearsChange: data.bearishChange || 0,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Fetch all sentiment metrics
 */
export async function fetchSentimentMetrics(): Promise<{
  bulls: number;
  bears: number;
  bullsChange: number;
  bearsChange: number;
  fearGreed: number;
  fearGreedChange: number;
}> {
  try {
    // Try to fetch AAII from static file first, fallback to defaults
    const aaii = (await fetchAAIIFromStatic()) || (await fetchAAIISentiment());
    const fearGreed = await fetchFearGreedIndex();

    return {
      bulls: aaii.bulls,
      bears: aaii.bears,
      bullsChange: aaii.bullsChange,
      bearsChange: aaii.bearsChange,
      fearGreed: fearGreed.value,
      fearGreedChange: fearGreed.change,
    };
  } catch (error) {
    console.error('Failed to fetch sentiment metrics, using fallback:', error);
    return {
      bulls: COMPASS_API_CONFIG.sentiment.fallback.bulls,
      bears: COMPASS_API_CONFIG.sentiment.fallback.bears,
      bullsChange: 0,
      bearsChange: 0,
      fearGreed: COMPASS_API_CONFIG.sentiment.fallback.fearGreed,
      fearGreedChange: 0,
    };
  }
}
