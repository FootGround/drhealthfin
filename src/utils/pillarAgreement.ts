// ============================================================================
// PILLAR AGREEMENT HELPERS - Categorize and interpret pillar scores (Story 7)
// ============================================================================

import { Pillars } from '@/types/marketCompass';

export interface PillarCategories {
  bullish: Array<[string, number]>;
  neutral: Array<[string, number]>;
  bearish: Array<[string, number]>;
}

/**
 * Categorize pillars into bullish (≥60), neutral (45-59), bearish (<45)
 */
export const categorizePillars = (pillars: Pillars): PillarCategories => {
  const entries = Object.entries(pillars);
  return {
    bullish: entries.filter(([, p]) => p.score >= 60).map(([k, p]) => [k, p.score]),
    neutral: entries.filter(([, p]) => p.score >= 45 && p.score < 60).map(([k, p]) => [k, p.score]),
    bearish: entries.filter(([, p]) => p.score < 45).map(([k, p]) => [k, p.score]),
  };
};

/**
 * Generate interpretation text based on pillar distribution
 */
export const getInterpretation = (categories: PillarCategories): string => {
  const { bullish, bearish } = categories;
  if (bullish.length >= 5) return 'Strong bullish signals across most pillars indicate favorable market conditions for risk assets.';
  if (bullish.length >= 4) return 'Leaning positive with constructive market backdrop. Majority of pillars show strength.';
  if (bearish.length >= 5) return 'Strong defensive signals suggest caution warranted. Most pillars showing stress.';
  if (bearish.length >= 4) return 'Leaning negative with stressed market conditions. Majority of pillars showing weakness.';
  return 'Mixed signals indicate neutral market conditions with no clear directional bias.';
};
