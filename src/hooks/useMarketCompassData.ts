/**
 * Market Compass Data Hook
 * Reads pre-computed compass data from static JSON (populated by GitHub Actions).
 * Falls back to config defaults if static data is unavailable.
 */

import { useEffect, useState, useCallback } from 'react';
import { MarketCompassRawData, DataStatus } from '@/types/marketCompass';
import { staticDataService, CompassData } from '@/services/staticDataService';
import { COMPASS_API_CONFIG } from '@/config/compassApiConfig';
import { getMarketStatus } from '@/utils/marketHours';

interface UseMarketCompassDataReturn {
  data: MarketCompassRawData | null;
  isLoading: boolean;
  error: string | null;
  dataStatus: DataStatus;
  refetch: () => Promise<void>;
}

/**
 * Map static compass data to MarketCompassRawData
 */
function mapCompassToRawData(compass: CompassData): MarketCompassRawData {
  const marketStatus = getMarketStatus();

  return {
    spy: {
      price: compass.direction.spy.price,
      percentVs200MA: compass.direction.spy.percentVs200MA,
      dailyChange: compass.direction.spy.dailyChange,
    },
    qqq: {
      price: compass.direction.qqq.price,
      percentVs200MA: compass.direction.qqq.percentVs200MA,
      dailyChange: compass.direction.qqq.dailyChange,
    },
    iwm: {
      price: compass.direction.iwm.price,
      percentVs200MA: compass.direction.iwm.percentVs200MA,
      dailyChange: compass.direction.iwm.dailyChange,
    },
    breadth: {
      advancers: compass.breadth.advancers,
      decliners: compass.breadth.decliners,
      percentAbove200MA: compass.breadth.percentAbove200MA,
      percentAbove200MAChange: compass.breadth.percentAbove200MAChange,
      newHighs: compass.breadth.newHighs,
      newLows: compass.breadth.newLows,
    },
    vix: {
      value: compass.volatility.vix.value,
      dailyChange: compass.volatility.vix.dailyChange,
      isContango: compass.volatility.vix.isContango,
    },
    putCall: {
      ratio: compass.volatility.putCall.ratio,
      change: compass.volatility.putCall.change,
    },
    yieldCurve: {
      spread: compass.credit.yieldCurveSpread,
      change: compass.credit.yieldCurveChange,
    },
    credit: {
      hySpread: compass.credit.hySpread,
      hySpreadChange: compass.credit.hySpreadChange,
      igSpread: compass.credit.igSpread,
      igSpreadChange: compass.credit.igSpreadChange,
    },
    sentiment: {
      bulls: compass.sentiment.bulls,
      bullsChange: compass.sentiment.bullsChange,
      bears: compass.sentiment.bears,
      bearsChange: compass.sentiment.bearsChange,
      fearGreed: compass.sentiment.fearGreed,
      fearGreedChange: compass.sentiment.fearGreedChange,
    },
    global: {
      acwi: {
        price: compass.global.acwi.price,
        percentVs50MA: compass.global.acwi.percentVs50MA,
        dailyChange: compass.global.acwi.dailyChange,
      },
      vstoxx: {
        value: compass.global.vstoxx.value,
        change: compass.global.vstoxx.change,
      },
      pmi: {
        value: compass.global.pmi.value,
        change: compass.global.pmi.change,
      },
    },
    updatedAt: new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    }) + ' EST',
    marketStatus,
  };
}

/**
 * Build fallback data from config defaults when static data is unavailable
 */
function buildFallbackData(): MarketCompassRawData {
  const marketStatus = getMarketStatus();
  const bFallback = COMPASS_API_CONFIG.breadth.fallback;
  const sFallback = COMPASS_API_CONFIG.sentiment.fallback;
  const gFallback = COMPASS_API_CONFIG.global.fallback;

  return {
    spy: { price: 0, percentVs200MA: 0, dailyChange: 0 },
    qqq: { price: 0, percentVs200MA: 0, dailyChange: 0 },
    iwm: { price: 0, percentVs200MA: 0, dailyChange: 0 },
    breadth: {
      advancers: bFallback.advancers,
      decliners: bFallback.decliners,
      percentAbove200MA: bFallback.percentAbove200MA,
      percentAbove200MAChange: bFallback.percentAbove200MAChange || 0,
      newHighs: bFallback.newHighs,
      newLows: bFallback.newLows,
    },
    vix: { value: 18, dailyChange: 0, isContango: true },
    putCall: { ratio: 0.85, change: 0 },
    yieldCurve: { spread: 0.35, change: 0 },
    credit: { hySpread: 3.5, hySpreadChange: 0, igSpread: 1.2, igSpreadChange: 0 },
    sentiment: {
      bulls: sFallback.bulls,
      bullsChange: sFallback.bullsChange,
      bears: sFallback.bears,
      bearsChange: sFallback.bearsChange,
      fearGreed: sFallback.fearGreed,
      fearGreedChange: sFallback.fearGreedChange,
    },
    global: {
      acwi: {
        price: gFallback.acwi.price,
        percentVs50MA: gFallback.acwi.percentVs50MA,
        dailyChange: gFallback.acwi.dailyChange,
      },
      vstoxx: { value: gFallback.vstoxx.value, change: gFallback.vstoxx.change },
      pmi: { value: gFallback.pmi.value, change: gFallback.pmi.change },
    },
    updatedAt: new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    }) + ' EST',
    marketStatus,
  };
}

/**
 * Hook to fetch and manage all Market Compass V6 data
 */
export function useMarketCompassData(): UseMarketCompassDataReturn {
  const [data, setData] = useState<MarketCompassRawData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const compass = await staticDataService.getCompassData();

      if (compass) {
        setData(mapCompassToRawData(compass));
      } else {
        console.warn('No compass data in static file, using fallbacks');
        setData(buildFallbackData());
      }

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market data';
      console.error('Market Compass data fetch error:', err);
      setError(errorMessage);
      setData(buildFallbackData());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Periodic refresh (check for updated static data)
  useEffect(() => {
    const marketStatus = getMarketStatus();
    let updateInterval: number;
    if (marketStatus === 'open') {
      updateInterval = 60000; // 1 minute during market hours
    } else if (marketStatus === 'pre-market' || marketStatus === 'after-hours') {
      updateInterval = 120000; // 2 minutes
    } else {
      updateInterval = 300000; // 5 minutes when closed
    }

    const intervalId = setInterval(async () => {
      // Force refresh the cache so we pick up new static data
      await staticDataService.refresh();
      fetchAllData();
    }, updateInterval);

    return () => clearInterval(intervalId);
  }, [fetchAllData]);

  const dataStatus: DataStatus = {
    isComplete: data !== null,
    missingSignals: [],
    lastUpdated: lastUpdate,
    staleDuration: Date.now() - lastUpdate.getTime(),
  };

  return {
    data,
    isLoading,
    error,
    dataStatus,
    refetch: fetchAllData,
  };
}
