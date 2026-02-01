import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { marketDataService } from '@/services/marketDataService';
import { INSTRUMENTS_BY_TIER } from '@/constants/instruments';
import { getUpdateIntervals } from '@/utils/marketHours';
import { FinnhubQuote } from '@/types/api';

const transformQuote = (ticker: string, quote: FinnhubQuote) => ({
  currentPrice: quote.c,
  change: quote.c - quote.pc,
  changePercent: ((quote.c - quote.pc) / quote.pc) * 100,
  previousClose: quote.pc,
  lastFetched: new Date().toISOString(),
});

export const useMarketData = () => {
  const { updateInstrument, setLoading, setError, calculateMetrics } =
    useDashboardStore();
  const intervalsRef = useRef<{ tier1?: NodeJS.Timeout; standard?: NodeJS.Timeout }>({});

  useEffect(() => {
    const intervals = getUpdateIntervals();

    const fetchTier1 = async () => {
      const tier1Instruments = INSTRUMENTS_BY_TIER[1] || [];
      const tickers = tier1Instruments.map((i) => i.ticker);

      try {
        const data = await marketDataService.fetchBatch(tickers);

        data.forEach((quote, ticker) => {
          updateInstrument(ticker, transformQuote(ticker, quote));
        });

        setError(null);
      } catch (err) {
        console.error('Failed to fetch Tier 1 data:', err);
        setError((err as Error).message);
      }
    };

    const fetchStandard = async () => {
      const standardInstruments = [
        ...(INSTRUMENTS_BY_TIER[2] || []),
        ...(INSTRUMENTS_BY_TIER[3] || []),
        ...(INSTRUMENTS_BY_TIER[4] || []),
        ...(INSTRUMENTS_BY_TIER[5] || []),
        ...(INSTRUMENTS_BY_TIER[6] || []),
      ];
      const tickers = standardInstruments.map((i) => i.ticker);

      try {
        const data = await marketDataService.fetchBatch(tickers);

        data.forEach((quote, ticker) => {
          updateInstrument(ticker, transformQuote(ticker, quote));
        });

        calculateMetrics();
        setError(null);
      } catch (err) {
        console.error('Failed to fetch standard data:', err);
        setError((err as Error).message);
      }
    };

    // Initial fetch
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchTier1(), fetchStandard()]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Set up intervals
    intervalsRef.current.tier1 = setInterval(fetchTier1, intervals.tier1);
    intervalsRef.current.standard = setInterval(fetchStandard, intervals.standard);

    // Cleanup
    return () => {
      if (intervalsRef.current.tier1) clearInterval(intervalsRef.current.tier1);
      if (intervalsRef.current.standard) clearInterval(intervalsRef.current.standard);
    };
  }, [updateInstrument, setLoading, setError, calculateMetrics]);

  return {
    status: marketDataService.getStatus(),
  };
};
