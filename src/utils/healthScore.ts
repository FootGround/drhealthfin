/**
 * Market Health Score Calculator
 *
 * Calculates a composite health score (0-100) based on key market indicators.
 * Weights are tunable via constants for easy adjustment.
 */

import { Instrument, MarketHealthStatus, HealthScoreResult } from '@/types/market';

// Configuration - Easy to tune based on backtesting
const WEIGHTS = {
  marketDirection: 0.40,    // SPY/QQQ performance
  riskAppetite: 0.30,       // IWM relative strength
  volatility: 0.30,         // VIX inverse
} as const;

// Normalization ranges - Based on typical daily market behavior
const RANGES = {
  marketChange: { min: -2.5, max: 2.5 },      // ±2.5% typical daily range
  relativeStrength: { min: -1.5, max: 1.5 },  // IWM vs SPY spread
  vix: { min: 10, max: 35 },                  // VIX typical range
} as const;

/**
 * Calculate market health score from instrument data
 * Returns neutral score (50) if data is incomplete
 *
 * @param instruments - Record of market instruments with price data
 * @returns HealthScoreResult with score, status, description, and component breakdowns
 */
export function calculateHealthScore(
  instruments: Record<string, Instrument>
): HealthScoreResult {
  if (import.meta.env.DEV) {
    const start = performance.now();
    const result = calculateHealthScoreInternal(instruments);
    const duration = performance.now() - start;

    if (duration > 10) {
      console.warn(`Health score calculation slow: ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  return calculateHealthScoreInternal(instruments);
}

/**
 * Internal implementation of health score calculation
 */
function calculateHealthScoreInternal(
  instruments: Record<string, Instrument>
): HealthScoreResult {
  // Extract required instruments - use safe fallbacks
  const spy = instruments['SPY'];
  const qqq = instruments['QQQ'];
  const iwm = instruments['IWM'];
  const vix = instruments['VIX'] || instruments['^VIX']; // Handle ticker variations

  // Graceful degradation - return neutral if missing data
  if (!spy || !qqq || !iwm || !vix) {
    return {
      score: 50,
      status: 'neutral',
      description: 'Insufficient data available',
      components: { marketDirection: 50, riskAppetite: 50, volatility: 50 }
    };
  }

  // Component 1: Market Direction (40%)
  const avgMarketChange = (spy.changePercent + qqq.changePercent) / 2;
  const marketScore = normalize(avgMarketChange, RANGES.marketChange);

  // Component 2: Risk Appetite (30%)
  const relativeStrength = iwm.changePercent - spy.changePercent;
  const riskScore = normalize(relativeStrength, RANGES.relativeStrength);

  // Component 3: Volatility (30%) - Inverted (low VIX = good)
  const vixScore = normalize(vix.currentPrice, RANGES.vix, true);

  // Weighted average
  const score = Math.round(
    marketScore * WEIGHTS.marketDirection +
    riskScore * WEIGHTS.riskAppetite +
    vixScore * WEIGHTS.volatility
  );

  return {
    score,
    status: scoreToStatus(score),
    description: getDescription(score, { marketScore, riskScore, vixScore }),
    components: {
      marketDirection: Math.round(marketScore),
      riskAppetite: Math.round(riskScore),
      volatility: Math.round(vixScore)
    }
  };
}

/**
 * Normalize value to 0-100 scale
 *
 * @param value - The value to normalize
 * @param range - Min and max bounds for the value
 * @param invert - Set true for inverse metrics (e.g., VIX - lower is better)
 * @returns Normalized score between 0 and 100
 */
function normalize(
  value: number,
  range: { min: number; max: number },
  invert = false
): number {
  const { min, max } = range;
  const clamped = Math.max(min, Math.min(max, value));
  const normalized = ((clamped - min) / (max - min)) * 100;
  return invert ? 100 - normalized : normalized;
}

/**
 * Map score to status category
 *
 * @param score - Health score (0-100)
 * @returns MarketHealthStatus category
 */
function scoreToStatus(score: number): MarketHealthStatus {
  if (score >= 75) return 'very-healthy';
  if (score >= 60) return 'healthy';
  if (score >= 40) return 'neutral';
  if (score >= 25) return 'unhealthy';
  return 'very-unhealthy';
}

/**
 * Generate simple, clear description based on score and components
 * No complex NLP - just clear status communication
 *
 * @param score - Overall health score
 * @param components - Component scores
 * @returns Human-readable description
 */
function getDescription(
  score: number,
  components: { marketScore: number; riskScore: number; vixScore: number }
): string {
  const { marketScore, riskScore, vixScore } = components;

  // Identify primary driver (highest deviation from neutral)
  const drivers = [
    { name: 'rising markets', score: marketScore },
    { name: 'risk-on sentiment', score: riskScore },
    { name: 'low volatility', score: vixScore }
  ];

  const strongest = drivers.reduce((a, b) =>
    Math.abs(b.score - 50) > Math.abs(a.score - 50) ? b : a
  );

  // Simple templates by status
  if (score >= 75) {
    return `Strong conditions led by ${strongest.name}`;
  } else if (score >= 60) {
    return `Healthy conditions with ${strongest.name}`;
  } else if (score >= 40) {
    return 'Mixed signals across markets';
  } else if (score >= 25) {
    return `Elevated stress from declining ${strongest.name}`;
  } else {
    return 'High volatility with broad weakness';
  }
}

// ============================================================================
// Historical Score Persistence
// ============================================================================

/**
 * Storage key for yesterday's health score
 */
const STORAGE_KEY = 'health-score-yesterday';

/**
 * Interface for stored score data
 */
interface StoredScore {
  score: number;
  date: string;
}

/**
 * Save today's health score to localStorage for tomorrow's comparison
 *
 * @param score - The health score to save (0-100)
 */
export function saveYesterdayScore(score: number): void {
  try {
    const today = new Date().toISOString().split('T')[0];
    const data: StoredScore = { score, date: today };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // Handle localStorage errors gracefully (quota exceeded, disabled, etc.)
    console.warn('Failed to save yesterday score:', error);
  }
}

/**
 * Retrieve yesterday's health score from localStorage
 * Returns null if no score exists or if the stored score is not from yesterday
 *
 * @returns Yesterday's score or null
 */
export function getYesterdayScore(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const { score, date }: StoredScore = JSON.parse(stored);

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Only return if actually from yesterday
    if (date === yesterdayStr) {
      return score;
    }

    return null;
  } catch (error) {
    // Handle JSON parse errors or localStorage errors gracefully
    console.warn('Failed to retrieve yesterday score:', error);
    return null;
  }
}