import { Tier, InstrumentCategory } from '@/types/market';

export interface InstrumentDefinition {
  ticker: string;
  name: string;
  tier: Tier;
  category: InstrumentCategory;
  tooltip: string;
  apiSymbol?: string; // Override for API-specific symbol format
}

export const INSTRUMENTS: InstrumentDefinition[] = [
  // Tier 1: The Minimalist Header (Always Visible)
  {
    ticker: 'SPY',
    name: 'US Market',
    tier: 1,
    category: 'equity',
    tooltip: 'S&P 500 ETF - Broad US market benchmark tracking 500 large-cap stocks',
  },
  {
    ticker: 'QQQ',
    name: 'Growth/Tech',
    tier: 1,
    category: 'equity',
    tooltip: 'Nasdaq-100 ETF - Tech-heavy index representing innovation sector',
  },
  {
    ticker: 'IWM',
    name: 'Risk Appetite',
    tier: 1,
    category: 'equity',
    tooltip: 'Russell 2000 ETF - Small-cap stocks that rise when investors take risk',
  },
  {
    ticker: 'VIXY',
    name: 'Market Stress',
    tier: 1,
    category: 'equity',
    tooltip: 'ProShares VIX Short-Term Futures ETF - Fear gauge. High = Market panic, Low = Calm',
  },
  {
    ticker: 'IEF',
    name: 'Valuation Pressure',
    tier: 1,
    category: 'equity',
    tooltip: 'iShares 7-10 Year Treasury Bond ETF - Cost of money. High yields pressure stock valuations',
  },

  // Tier 2: Broad Market Barometers
  {
    ticker: 'URTH',
    name: 'Developed Markets',
    tier: 2,
    category: 'equity',
    tooltip: 'Global developed markets ETF - Tracks economic health of rich nations',
  },
  {
    ticker: 'ACWI',
    name: 'Whole World',
    tier: 2,
    category: 'equity',
    tooltip: 'All Country World Index - Every major market combined',
  },
  {
    ticker: 'DJIA',
    name: 'Industrial Average',
    tier: 2,
    category: 'index',
    tooltip: 'Dow Jones - 30 blue-chip stocks, oldest US market index',
    apiSymbol: '^DJI',
  },

  // Tier 3: Style, Size & Ratios
  {
    ticker: 'RSP',
    name: 'Equal Weight S&P',
    tier: 3,
    category: 'equity',
    tooltip: 'Market breadth indicator - Each S&P 500 stock weighted equally',
  },
  {
    ticker: 'VTV',
    name: 'Value Stocks',
    tier: 3,
    category: 'equity',
    tooltip: 'Value stocks - Cheaper, dividend-paying companies (defensive)',
  },
  {
    ticker: 'VUG',
    name: 'Growth Stocks',
    tier: 3,
    category: 'equity',
    tooltip: 'Growth stocks - High-growth companies (aggressive)',
  },

  // Tier 4: Sector Pulse
  {
    ticker: 'XLK',
    name: 'Technology',
    tier: 4,
    category: 'equity',
    tooltip: 'Tech sector - Apple, Microsoft, Nvidia. Innovation engine',
  },
  {
    ticker: 'XLF',
    name: 'Financials',
    tier: 4,
    category: 'equity',
    tooltip: 'Financial sector - Banks & insurance. Economic health indicator',
  },
  {
    ticker: 'XLE',
    name: 'Energy',
    tier: 4,
    category: 'equity',
    tooltip: 'Energy sector - Oil & gas. Rises with inflation or geopolitical tension',
  },
  {
    ticker: 'XLV',
    name: 'Healthcare',
    tier: 4,
    category: 'equity',
    tooltip: 'Healthcare sector - Defensive play during market uncertainty',
  },
  {
    ticker: 'XLY',
    name: 'Consumer Discretionary',
    tier: 4,
    category: 'equity',
    tooltip: 'Discretionary spending - Amazon, Tesla. Bought when consumers feel confident',
  },
  {
    ticker: 'XLP',
    name: 'Consumer Staples',
    tier: 4,
    category: 'equity',
    tooltip: 'Essential goods - Food, toiletries. Bought regardless of economy',
  },

  // Tier 5: Macro & Shadow Markets
  {
    ticker: 'DXY',
    name: 'US Dollar',
    tier: 5,
    category: 'currency',
    tooltip: 'Dollar Index - Strong dollar = global liquidity tightens',
    apiSymbol: 'DX-Y.NYB',
  },
  {
    ticker: 'WTI',
    name: 'Oil',
    tier: 5,
    category: 'commodity',
    tooltip: 'Crude Oil - Inflation signal. High prices squeeze consumers',
    apiSymbol: 'CL=F',
  },
  {
    ticker: 'GLD',
    name: 'Gold',
    tier: 5,
    category: 'commodity',
    tooltip: 'Gold ETF - Safe haven. Rises when investors fear currency debasement',
    apiSymbol: 'GC=F',
  },

  // Tier 6: Single-Stock Titans
  {
    ticker: 'AAPL',
    name: 'Apple',
    tier: 6,
    category: 'equity',
    tooltip: 'Apple Inc - Largest company by market cap, consumer tech bellwether',
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft',
    tier: 6,
    category: 'equity',
    tooltip: 'Microsoft - Cloud & enterprise software leader',
  },
  {
    ticker: 'NVDA',
    name: 'Nvidia',
    tier: 6,
    category: 'equity',
    tooltip: 'Nvidia - AI chip leader, semiconductor proxy',
  },
  {
    ticker: 'AMZN',
    name: 'Amazon',
    tier: 6,
    category: 'equity',
    tooltip: 'Amazon - E-commerce & cloud infrastructure giant',
  },
  {
    ticker: 'JPM',
    name: 'JPMorgan',
    tier: 6,
    category: 'equity',
    tooltip: 'JPMorgan Chase - Largest US bank, financial system health indicator',
  },
];

// Group instruments by tier for efficient fetching
export const INSTRUMENTS_BY_TIER = INSTRUMENTS.reduce(
  (acc, instrument) => {
    if (!acc[instrument.tier]) {
      acc[instrument.tier] = [];
    }
    acc[instrument.tier].push(instrument);
    return acc;
  },
  {} as Record<Tier, InstrumentDefinition[]>
);

// Symbol mapping for API calls
export const SYMBOL_MAP: Record<string, string> = INSTRUMENTS.reduce(
  (acc, instrument) => {
    acc[instrument.ticker] = instrument.apiSymbol || instrument.ticker;
    return acc;
  },
  {} as Record<string, string>
);
