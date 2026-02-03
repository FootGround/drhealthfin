export type Timeframe = '1D' | '1W' | '1M' | 'YTD';

export type InstrumentCategory = 'equity' | 'index' | 'commodity' | 'currency';

export type HealthStatus = 'positive' | 'negative' | 'neutral';

export type MarketHealthStatus = 'very-healthy' | 'healthy' | 'neutral' | 'unhealthy' | 'very-unhealthy';

export type Tier = 1 | 2 | 3 | 4 | 5 | 6;

export interface Instrument {
  ticker: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  previousClose: number;
  tier: Tier;
  category: InstrumentCategory;
  sparkline: number[];
  health: HealthStatus;
  tooltip: string;
  lastFetched: string;
}

export interface CalculatedMetrics {
  vtvVugRatio: number;
  xlyXlpRatio: number;
}

export interface HistoricalData {
  [ticker: string]: {
    '1D': number[];
    '1W': number[];
    '1M': number[];
    'YTD': number[];
  };
}

export interface HealthScoreResult {
  score: number;
  status: MarketHealthStatus;
  description: string;
  components: {
    marketDirection: number;
    riskAppetite: number;
    volatility: number;
  };
}

export interface MarketDataStore {
  lastUpdated: string;
  isLoading: boolean;
  error: string | null;
  instruments: Record<string, Instrument>;
  calculatedMetrics: CalculatedMetrics;
  historical: HistoricalData;
  timeframe: Timeframe;
  focusMode: boolean;
  theme: 'light' | 'dark';

  // Market Health Score
  healthScore: number;
  healthStatus: MarketHealthStatus;
  previousScore: number | null;

  // Actions
  updateInstrument: (ticker: string, data: Partial<Instrument>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setFocusMode: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  calculateMetrics: () => void;
  updateHealthData: (result: HealthScoreResult) => void;
}
