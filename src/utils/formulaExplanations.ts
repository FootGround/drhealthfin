// ============================================================================
// FORMULA EXPLANATIONS - Transparency for signal scoring
// Based on PRD_Transparency_v3.md Story 5 specifications
// ============================================================================

export interface FormulaThreshold {
  range: string;        // e.g., "< 15", "15-25", "> 25"
  label: string;        // e.g., "Calm", "Normal", "Stressed"
  scoreRange: string;   // e.g., "70-100", "40-70", "0-40"
}

export interface FormulaExplanation {
  name: string;
  formula: string;
  bounds: string;
  thresholds: FormulaThreshold[];
  rationale: string;
}

// ============================================================================
// ALL 18 SIGNAL FORMULAS
// Organized by pillar: Direction, Breadth, Volatility, Credit, Sentiment, Global
// ============================================================================

export const formulaExplanations: Record<string, FormulaExplanation> = {
  // =========================================================================
  // DIRECTION PILLAR (25% weight)
  // =========================================================================

  spyVs200MA: {
    name: 'S&P 500 vs 200-Day MA',
    formula: 'Stepped scoring based on % distance from 200-day moving average',
    bounds: '0 ≤ score ≤ 100',
    thresholds: [
      { range: '≥ 10%', label: 'Strong uptrend', scoreRange: '100' },
      { range: '5% to 10%', label: 'Uptrend', scoreRange: '85' },
      { range: '2% to 5%', label: 'Above trend', scoreRange: '70' },
      { range: '0% to 2%', label: 'Near trend', scoreRange: '55' },
      { range: '-2% to 0%', label: 'Below trend', scoreRange: '45' },
      { range: '-5% to -2%', label: 'Downtrend', scoreRange: '30' },
      { range: '-10% to -5%', label: 'Strong downtrend', scoreRange: '15' },
      { range: '< -10%', label: 'Extreme downtrend', scoreRange: '0' },
    ],
    rationale: 'Price above 200-day moving average indicates long-term uptrend. Most significant trend indicator.',
  },

  qqqVs200MA: {
    name: 'Nasdaq 100 vs 200-Day MA',
    formula: 'Same as SPY formula (stepped by % distance)',
    bounds: '0 ≤ score ≤ 100',
    thresholds: [
      { range: '≥ 10%', label: 'Strong uptrend', scoreRange: '100' },
      { range: '5% to 10%', label: 'Uptrend', scoreRange: '85' },
      { range: '2% to 5%', label: 'Above trend', scoreRange: '70' },
      { range: '0% to 2%', label: 'Near trend', scoreRange: '55' },
      { range: '< 0%', label: 'Below trend', scoreRange: '0-45' },
    ],
    rationale: 'Tech-heavy Nasdaq provides growth/risk appetite signal. Often leads broader market.',
  },

  iwmVs200MA: {
    name: 'Russell 2000 vs 200-Day MA',
    formula: 'Same as SPY formula (stepped by % distance)',
    bounds: '0 ≤ score ≤ 100',
    thresholds: [
      { range: '≥ 10%', label: 'Strong uptrend', scoreRange: '100' },
      { range: '5% to 10%', label: 'Uptrend', scoreRange: '85' },
      { range: '2% to 5%', label: 'Above trend', scoreRange: '70' },
      { range: '0% to 2%', label: 'Near trend', scoreRange: '55' },
      { range: '< 0%', label: 'Below trend', scoreRange: '0-45' },
    ],
    rationale: 'Small caps indicate risk appetite and domestic economic health.',
  },

  // =========================================================================
  // BREADTH PILLAR (20% weight)
  // =========================================================================

  advanceDeclineRatio: {
    name: 'Advance/Decline Ratio',
    formula: 'score based on advancers / (advancers + decliners)',
    bounds: '0 ≤ score ≤ 100',
    thresholds: [
      { range: '≥ 75%', label: 'Strong breadth', scoreRange: '100' },
      { range: '65% to 75%', label: 'Good breadth', scoreRange: '80' },
      { range: '55% to 65%', label: 'Positive', scoreRange: '60' },
      { range: '45% to 55%', label: 'Neutral', scoreRange: '40' },
      { range: '35% to 45%', label: 'Weak', scoreRange: '20' },
      { range: '< 35%', label: 'Very weak', scoreRange: '0' },
    ],
    rationale: 'Higher percentage of advancing stocks indicates broad market participation, not just a few leaders.',
  },

  percentAbove200MA: {
    name: '% of Stocks Above 200-Day MA',
    formula: 'Stepped scoring based on percentage',
    bounds: '0 ≤ score ≤ 100',
    thresholds: [
      { range: '≥ 80%', label: 'Extremely strong', scoreRange: '100' },
      { range: '70% to 80%', label: 'Strong', scoreRange: '85' },
      { range: '60% to 70%', label: 'Above average', scoreRange: '70' },
      { range: '50% to 60%', label: 'Neutral', scoreRange: '50' },
      { range: '40% to 50%', label: 'Weak', scoreRange: '35' },
      { range: '30% to 40%', label: 'Very weak', scoreRange: '20' },
      { range: '< 30%', label: 'Extremely weak', scoreRange: '0' },
    ],
    rationale: 'Measures broad market health. Above 60% indicates strong participation.',
  },

  newHighsVsLows: {
    name: 'New Highs vs New Lows',
    formula: 'score based on ratio of new highs to new lows',
    bounds: '0 ≤ score ≤ 100',
    thresholds: [
      { range: '≥ 5:1', label: 'Extremely bullish', scoreRange: '100' },
      { range: '3:1 to 5:1', label: 'Bullish', scoreRange: '80' },
      { range: '1.5:1 to 3:1', label: 'Positive', scoreRange: '65' },
      { range: '1:1', label: 'Neutral', scoreRange: '50' },
      { range: '0.5:1 to 1:1', label: 'Negative', scoreRange: '35' },
      { range: '0.2:1 to 0.5:1', label: 'Bearish', scoreRange: '20' },
      { range: '< 0.2:1', label: 'Extremely bearish', scoreRange: '0' },
    ],
    rationale: 'More new highs than new lows indicates healthy market momentum and leadership.',
  },

  // =========================================================================
  // VOLATILITY PILLAR (15% weight)
  // =========================================================================

  vix: {
    name: 'VIX (Volatility Index)',
    formula: 'Inverse scoring: lower VIX = higher score',
    bounds: '0 ≤ score ≤ 100',
    thresholds: [
      { range: '≤ 12', label: 'Very calm', scoreRange: '100' },
      { range: '12 to 15', label: 'Calm', scoreRange: '85' },
      { range: '15 to 18', label: 'Normal', scoreRange: '70' },
      { range: '18 to 22', label: 'Elevated', scoreRange: '55' },
      { range: '22 to 28', label: 'High', scoreRange: '35' },
      { range: '28 to 35', label: 'Very high', scoreRange: '20' },
      { range: '> 35', label: 'Extreme', scoreRange: '0' },
    ],
    rationale: 'Lower volatility indicates healthier market conditions. VIX below 20 is considered calm.',
  },

  putCallRatio: {
    name: 'Put/Call Ratio',
    formula: 'Contrarian scoring based on ratio bands',
    bounds: '10 ≤ score ≤ 90',
    thresholds: [
      { range: '≥ 1.3', label: 'High fear (bullish)', scoreRange: '90' },
      { range: '1.1 to 1.3', label: 'Elevated fear', scoreRange: '75' },
      { range: '0.9 to 1.1', label: 'Balanced', scoreRange: '60' },
      { range: '0.7 to 0.9', label: 'Neutral', scoreRange: '50' },
      { range: '0.6 to 0.7', label: 'Complacent', scoreRange: '40' },
      { range: '0.5 to 0.6', label: 'Low fear', scoreRange: '25' },
      { range: '< 0.5', label: 'Extreme greed', scoreRange: '10' },
    ],
    rationale: 'Higher put/call ratio (more puts than calls) indicates fear, which is contrarian bullish.',
  },

  vixTermStructure: {
    name: 'VIX Term Structure',
    formula: 'Binary: Contango = 70, Backwardation = 30',
    bounds: '30 or 70 (binary)',
    thresholds: [
      { range: 'Contango', label: 'Normal', scoreRange: '70' },
      { range: 'Backwardation', label: 'Stress', scoreRange: '30' },
    ],
    rationale: 'Contango (futures > spot) is normal market structure. Backwardation indicates immediate fear.',
  },

  // =========================================================================
  // CREDIT PILLAR (15% weight)
  // =========================================================================

  yieldCurve10Y2Y: {
    name: 'Yield Curve (10Y-2Y Spread)',
    formula: 'Stepped scoring based on spread in percentage points',
    bounds: '0 ≤ score ≤ 100',
    thresholds: [
      { range: '≥ 1.0%', label: 'Very steep', scoreRange: '100' },
      { range: '0.5% to 1.0%', label: 'Steep', scoreRange: '85' },
      { range: '0.25% to 0.5%', label: 'Normal', scoreRange: '70' },
      { range: '0% to 0.25%', label: 'Flat', scoreRange: '55' },
      { range: '-0.25% to 0%', label: 'Inverted', scoreRange: '35' },
      { range: '-0.5% to -0.25%', label: 'Deeply inverted', scoreRange: '20' },
      { range: '< -0.5%', label: 'Extremely inverted', scoreRange: '0' },
    ],
    rationale: 'Positive spread (normal curve) indicates healthy growth expectations. Inversion historically precedes recessions.',
  },

  highYieldSpread: {
    name: 'High Yield Spread (HYG)',
    formula: 'Inverse scoring: tighter spread = higher score',
    bounds: '0 ≤ score ≤ 100',
    thresholds: [
      { range: '≤ 2.5%', label: 'Very tight', scoreRange: '100' },
      { range: '2.5% to 3.5%', label: 'Tight', scoreRange: '80' },
      { range: '3.5% to 4.5%', label: 'Normal', scoreRange: '60' },
      { range: '4.5% to 5.5%', label: 'Elevated', scoreRange: '45' },
      { range: '5.5% to 7%', label: 'Wide', scoreRange: '30' },
      { range: '7% to 9%', label: 'Very wide', scoreRange: '15' },
      { range: '> 9%', label: 'Distressed', scoreRange: '0' },
    ],
    rationale: 'Tighter spreads indicate investors are comfortable taking credit risk. Widening spreads signal stress.',
  },

  investmentGradeSpread: {
    name: 'Investment Grade Spread (LQD)',
    formula: 'Inverse scoring: tighter spread = higher score',
    bounds: '10 ≤ score ≤ 100',
    thresholds: [
      { range: '≤ 0.8%', label: 'Very tight', scoreRange: '100' },
      { range: '0.8% to 1.0%', label: 'Tight', scoreRange: '80' },
      { range: '1.0% to 1.3%', label: 'Normal', scoreRange: '60' },
      { range: '1.3% to 1.6%', label: 'Elevated', scoreRange: '45' },
      { range: '1.6% to 2.0%', label: 'Wide', scoreRange: '30' },
      { range: '> 2.0%', label: 'Very wide', scoreRange: '10' },
    ],
    rationale: 'IG spreads widen during credit stress. Below 1.5% is healthy.',
  },

  // =========================================================================
  // SENTIMENT PILLAR (10% weight)
  // =========================================================================

  aaiiBulls: {
    name: 'AAII Bulls %',
    formula: 'Contrarian scoring: lower bulls = higher score',
    bounds: '10 ≤ score ≤ 95',
    thresholds: [
      { range: '≤ 20%', label: 'Extreme pessimism', scoreRange: '95' },
      { range: '20% to 30%', label: 'Pessimistic', scoreRange: '75' },
      { range: '30% to 40%', label: 'Below average', scoreRange: '55' },
      { range: '40% to 50%', label: 'Average', scoreRange: '40' },
      { range: '50% to 60%', label: 'Optimistic', scoreRange: '25' },
      { range: '> 60%', label: 'Extreme optimism', scoreRange: '10' },
    ],
    rationale: 'Contrarian indicator. Low bullishness (pessimism) is bullish. Historical average is ~38%.',
  },

  aaiiBears: {
    name: 'AAII Bears %',
    formula: 'Contrarian scoring: higher bears = higher score',
    bounds: '15 ≤ score ≤ 95',
    thresholds: [
      { range: '≥ 50%', label: 'Extreme fear', scoreRange: '95' },
      { range: '40% to 50%', label: 'High fear', scoreRange: '75' },
      { range: '30% to 40%', label: 'Elevated fear', scoreRange: '55' },
      { range: '25% to 30%', label: 'Average', scoreRange: '45' },
      { range: '20% to 25%', label: 'Low fear', scoreRange: '30' },
      { range: '< 20%', label: 'Complacency', scoreRange: '15' },
    ],
    rationale: 'Contrarian indicator. High bearishness is bullish. Historical average is ~30%.',
  },

  fearGreedIndex: {
    name: 'CNN Fear & Greed Index',
    formula: 'Contrarian scoring: lower index = higher score',
    bounds: '5 ≤ score ≤ 95',
    thresholds: [
      { range: '≤ 10', label: 'Extreme Fear', scoreRange: '95' },
      { range: '10 to 25', label: 'Fear', scoreRange: '80' },
      { range: '25 to 40', label: 'Mild fear', scoreRange: '60' },
      { range: '40 to 60', label: 'Neutral', scoreRange: '50' },
      { range: '60 to 75', label: 'Mild greed', scoreRange: '35' },
      { range: '75 to 90', label: 'Greed', scoreRange: '20' },
      { range: '> 90', label: 'Extreme Greed', scoreRange: '5' },
    ],
    rationale: 'Contrarian indicator. Extreme fear is contrarian bullish. Index ranges 0-100.',
  },

  // =========================================================================
  // GLOBAL PILLAR (15% weight)
  // =========================================================================

  msciWorldVs50MA: {
    name: 'MSCI World (ACWI) vs 50-Day MA',
    formula: 'Same as SPY formula (stepped by % distance)',
    bounds: '0 ≤ score ≤ 100',
    thresholds: [
      { range: '≥ 10%', label: 'Strong uptrend', scoreRange: '100' },
      { range: '5% to 10%', label: 'Uptrend', scoreRange: '85' },
      { range: '2% to 5%', label: 'Above trend', scoreRange: '70' },
      { range: '0% to 2%', label: 'Near trend', scoreRange: '55' },
      { range: '< 0%', label: 'Below trend', scoreRange: '0-45' },
    ],
    rationale: 'Global equity performance indicates broad risk appetite beyond US markets.',
  },

  vstoxx: {
    name: 'VSTOXX (European Volatility)',
    formula: 'Similar to VIX formula (inverse scoring)',
    bounds: '15 ≤ score ≤ 100',
    thresholds: [
      { range: '≤ 12', label: 'Very calm', scoreRange: '100' },
      { range: '12 to 15', label: 'Calm', scoreRange: '85' },
      { range: '15 to 18', label: 'Normal', scoreRange: '70' },
      { range: '18 to 22', label: 'Elevated', scoreRange: '55' },
      { range: '22 to 28', label: 'High', scoreRange: '35' },
      { range: '> 28', label: 'Very high', scoreRange: '15' },
    ],
    rationale: 'European volatility gauge. Low VSTOXX indicates calm global markets.',
  },

  globalPMI: {
    name: 'Global PMI',
    formula: 'Stepped scoring based on PMI level',
    bounds: '0 ≤ score ≤ 100',
    thresholds: [
      { range: '≥ 57', label: 'Very strong expansion', scoreRange: '100' },
      { range: '54 to 57', label: 'Strong expansion', scoreRange: '80' },
      { range: '51 to 54', label: 'Moderate expansion', scoreRange: '65' },
      { range: '50 to 51', label: 'Slight expansion', scoreRange: '50' },
      { range: '48 to 50', label: 'Slight contraction', scoreRange: '35' },
      { range: '45 to 48', label: 'Contraction', scoreRange: '20' },
      { range: '< 45', label: 'Deep contraction', scoreRange: '0' },
    ],
    rationale: 'PMI above 50 indicates economic expansion. Leading indicator for global growth.',
  },
};

// ============================================================================
// HELPER FUNCTION - Get formatted explanation for a signal
// ============================================================================

/**
 * Generate formatted explanation for a signal with current values
 * @param signalKey - Key matching formulaExplanations (e.g., 'vix', 'putCallRatio')
 * @param rawValue - Current raw value of the signal
 * @param score - Current calculated score (0-100)
 * @returns Formatted multi-line explanation string
 */
export const getFormulaExplanation = (
  signalKey: string,
  rawValue: number | boolean | string,
  score: number
): string => {
  const formula = formulaExplanations[signalKey];
  if (!formula) {
    return 'Formula not available';
  }

  // Format raw value for display
  const displayRaw =
    typeof rawValue === 'boolean'
      ? rawValue
        ? 'Contango'
        : 'Backwardation'
      : rawValue;

  // Build explanation string
  let explanation = `${formula.name}\n\n`;
  explanation += `Raw Value: ${displayRaw}\n`;
  explanation += `Formula: ${formula.formula}\n`;
  explanation += `Bounded: ${formula.bounds}\n\n`;
  explanation += `Current Score: ${score} pts\n\n`;
  explanation += `Thresholds:\n`;

  formula.thresholds.forEach((threshold) => {
    explanation += `• ${threshold.range} = ${threshold.label} (${threshold.scoreRange} pts)\n`;
  });

  explanation += `\n${formula.rationale}`;

  return explanation;
};

/**
 * Get formula for a signal key
 * @param signalKey - Key matching formulaExplanations
 * @returns FormulaExplanation or undefined
 */
export const getFormula = (signalKey: string): FormulaExplanation | undefined => {
  return formulaExplanations[signalKey];
};

/**
 * Get all signal keys
 * @returns Array of all signal keys
 */
export const getAllSignalKeys = (): string[] => {
  return Object.keys(formulaExplanations);
};
