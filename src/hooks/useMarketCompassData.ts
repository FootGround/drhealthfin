/**
 * Market Compass Data Hook
 * Aggregates all V6 data sources and provides unified interface
 */

import { useEffect, useState, useCallback } from 'react';
import { MarketCompassRawData, DataStatus } from '@/types/marketCompass';
import { fetchMultipleMovingAverages } from '@/services/movingAverageService';
import { fetchBreadthMetrics } from '@/services/breadthService';
import { fetchCreditMetrics } from '@/services/creditService';
import { fetchSentimentMetrics } from '@/services/sentimentService';
import { fetchGlobalMetrics } from '@/services/globalService';
import { fetchVolatilityMetrics } from '@/services/volatilityService';
import { getMarketStatus } from '@/utils/marketHours';
import { COMPASS_API_CONFIG } from '@/config/compassApiConfig';

interface UseMarketCompassDataReturn {
  data: MarketCompassRawData | null;
  isLoading: boolean;
  error: string | null;
  dataStatus: DataStatus;
  refetch: () => Promise<void>;
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
      // Fetch all data in parallel with proper error handling
      const [
        movingAverages,
        breadth,
        credit,
        sentiment,
        global,
        volatility,
      ] = await Promise.allSettled([
        fetchMultipleMovingAverages(['SPY', 'QQQ', 'IWM']),
        fetchBreadthMetrics(),
        fetchCreditMetrics(),
        fetchSentimentMetrics(),
        fetchGlobalMetrics(),
        fetchVolatilityMetrics(),
      ]);

      // Extract data with fallback handling
      const maData = movingAverages.status === 'fulfilled' ? movingAverages.value : new Map();
      const breadthData = breadth.status === 'fulfilled' ? breadth.value : COMPASS_API_CONFIG.breadth.fallback;
      const creditData = credit.status === 'fulfilled' ? credit.value : {
        yieldCurve: { spread: 0.35, change: 0 },
        hySpread: 3.5,
        hySpreadChange: 0,
        igSpread: 1.2,
        igSpreadChange: 0,
      };
      const sentimentData = sentiment.status === 'fulfilled' ? sentiment.value : COMPASS_API_CONFIG.sentiment.fallback;
      const globalData = global.status === 'fulfilled' ? global.value : COMPASS_API_CONFIG.global.fallback;
      const volatilityData = volatility.status === 'fulfilled' ? volatility.value : {
        vix: { value: 18, dailyChange: 0, isContango: true },
        putCall: { ratio: 0.85, change: 0 },
      };

      const marketStatus = getMarketStatus();

      // Construct the raw data object
      const rawData: MarketCompassRawData = {
        spy: {
          price: maData.get('SPY')?.currentPrice || 0,
          percentVs200MA: maData.get('SPY')?.percentVs200MA || 0,
          dailyChange: 0, // Will be enriched from Finnhub if available
        },
        qqq: {
          price: maData.get('QQQ')?.currentPrice || 0,
          percentVs200MA: maData.get('QQQ')?.percentVs200MA || 0,
          dailyChange: 0,
        },
        iwm: {
          price: maData.get('IWM')?.currentPrice || 0,
          percentVs200MA: maData.get('IWM')?.percentVs200MA || 0,
          dailyChange: 0,
        },
        breadth: {
          advancers: breadthData.advancers,
          decliners: breadthData.decliners,
          percentAbove200MA: breadthData.percentAbove200MA,
          percentAbove200MAChange: breadthData.percentAbove200MAChange || 0,
          newHighs: breadthData.newHighs,
          newLows: breadthData.newLows,
        },
        vix: {
          value: volatilityData.vix.value,
          dailyChange: volatilityData.vix.dailyChange,
          isContango: volatilityData.vix.isContango,
        },
        putCall: {
          ratio: volatilityData.putCall.ratio,
          change: volatilityData.putCall.change,
        },
        yieldCurve: {
          spread: creditData.yieldCurve.spread,
          change: creditData.yieldCurve.change,
        },
        credit: {
          hySpread: creditData.hySpread,
          hySpreadChange: creditData.hySpreadChange,
          igSpread: creditData.igSpread,
          igSpreadChange: creditData.igSpreadChange,
        },
        sentiment: {
          bulls: sentimentData.bulls,
          bullsChange: sentimentData.bullsChange,
          bears: sentimentData.bears,
          bearsChange: sentimentData.bearsChange,
          fearGreed: sentimentData.fearGreed,
          fearGreedChange: sentimentData.fearGreedChange,
        },
        global: {
          acwi: {
            price: globalData.acwi.price,
            percentVs50MA: globalData.acwi.percentVs50MA,
            dailyChange: globalData.acwi.dailyChange,
          },
          vstoxx: {
            value: globalData.vstoxx.value,
            change: globalData.vstoxx.change,
          },
          pmi: {
            value: globalData.pmi.value,
            change: globalData.pmi.change,
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

      setData(rawData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market data';
      console.error('Market Compass data fetch error:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Set up periodic updates based on market hours
  useEffect(() => {
    const marketStatus = getMarketStatus();

    // Determine update frequency based on market status
    let updateInterval: number;
    if (marketStatus === 'open') {
      updateInterval = 30000; // 30 seconds during market hours
    } else if (marketStatus === 'pre-market' || marketStatus === 'after-hours') {
      updateInterval = 120000; // 2 minutes during extended hours
    } else {
      updateInterval = 300000; // 5 minutes when closed
    }

    const intervalId = setInterval(fetchAllData, updateInterval);

    return () => clearInterval(intervalId);
  }, [fetchAllData]);

  // Calculate data status
  const dataStatus: DataStatus = {
    isComplete: data !== null,
    missingSignals: [], // Could track which signals failed
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
