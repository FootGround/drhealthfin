import { create } from 'zustand';
import { MarketDataStore, Instrument } from '@/types/market';
import { INSTRUMENTS } from '@/constants/instruments';
import { calculateHealth } from '@/utils/healthCalculator';
import { saveYesterdayScore, getYesterdayScore } from '@/utils/healthScore';

const initialInstruments: Record<string, Instrument> = INSTRUMENTS.reduce(
  (acc, def) => {
    acc[def.ticker] = {
      ticker: def.ticker,
      name: def.name,
      currentPrice: 0,
      change: 0,
      changePercent: 0,
      previousClose: 0,
      tier: def.tier,
      category: def.category,
      sparkline: [],
      health: 'neutral',
      tooltip: def.tooltip,
      lastFetched: new Date().toISOString(),
    };
    return acc;
  },
  {} as Record<string, Instrument>
);

export const useDashboardStore = create<MarketDataStore>((set, get) => ({
  lastUpdated: new Date().toISOString(),
  isLoading: true,
  error: null,
  instruments: initialInstruments,
  calculatedMetrics: {
    vtvVugRatio: 0,
    xlyXlpRatio: 0,
  },
  historical: {},
  timeframe: '1D',
  focusMode: false,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',

  // Market Health Score
  healthScore: 50,
  healthStatus: 'neutral',
  previousScore: getYesterdayScore(),

  updateInstrument: (ticker, data) =>
    set((state) => {
      const existing = state.instruments[ticker];
      if (!existing) return state;

      const updated: Instrument = {
        ...existing,
        ...data,
        health: data.changePercent !== undefined
          ? calculateHealth(data.changePercent)
          : existing.health,
      };

      return {
        instruments: {
          ...state.instruments,
          [ticker]: updated,
        },
        lastUpdated: new Date().toISOString(),
      };
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setTimeframe: (timeframe) => set({ timeframe }),

  setFocusMode: (enabled) => {
    localStorage.setItem('focusMode', String(enabled));
    set({ focusMode: enabled });
  },

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },

  calculateMetrics: () => {
    const state = get();
    const { instruments } = state;

    // VTV/VUG Ratio (Value vs Growth)
    const vtvPrice = instruments.VTV?.currentPrice || 0;
    const vugPrice = instruments.VUG?.currentPrice || 0;
    const vtvVugRatio = vugPrice > 0 ? vtvPrice / vugPrice : 0;

    // XLY/XLP Ratio (Consumer Confidence)
    const xlyPrice = instruments.XLY?.currentPrice || 0;
    const xlpPrice = instruments.XLP?.currentPrice || 0;
    const xlyXlpRatio = xlpPrice > 0 ? xlyPrice / xlpPrice : 0;

    set({
      calculatedMetrics: {
        vtvVugRatio,
        xlyXlpRatio,
      },
    });
  },

  updateHealthData: (result) => {
    set({
      healthScore: result.score,
      healthStatus: result.status,
      previousScore: getYesterdayScore()
    });

    // Save for tomorrow's comparison
    saveYesterdayScore(result.score);
  },
}));

// Initialize theme on load
if (typeof window !== 'undefined') {
  const theme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
