/**
 * Scoring Rules — Pure functions that convert raw market values to 0-100 scores.
 * Each function maps a raw indicator value to a discrete score bucket.
 */

export const scoringRules = {
  priceVs200MA: (percentAbove: number) => {
    if (percentAbove >= 10) return 100;
    if (percentAbove >= 5) return 85;
    if (percentAbove >= 2) return 70;
    if (percentAbove >= 0) return 55;
    if (percentAbove >= -2) return 45;
    if (percentAbove >= -5) return 30;
    if (percentAbove >= -10) return 15;
    return 0;
  },

  advanceDeclineRatio: (advancers: number, decliners: number) => {
    const total = advancers + decliners;
    if (total === 0) return 50;
    const ratio = advancers / total;
    if (ratio >= 0.75) return 100;
    if (ratio >= 0.65) return 80;
    if (ratio >= 0.55) return 60;
    if (ratio >= 0.45) return 40;
    if (ratio >= 0.35) return 20;
    return 0;
  },

  percentAbove200MA: (percent: number) => {
    if (percent >= 80) return 100;
    if (percent >= 70) return 85;
    if (percent >= 60) return 70;
    if (percent >= 50) return 50;
    if (percent >= 40) return 35;
    if (percent >= 30) return 20;
    return 0;
  },

  newHighsVsLows: (highs: number, lows: number) => {
    if (lows === 0) return highs > 0 ? 100 : 50;
    const ratio = highs / lows;
    if (ratio >= 5) return 100;
    if (ratio >= 3) return 80;
    if (ratio >= 1.5) return 65;
    if (ratio >= 1) return 50;
    if (ratio >= 0.5) return 35;
    if (ratio >= 0.2) return 20;
    return 0;
  },

  vix: (value: number) => {
    if (value <= 12) return 100;
    if (value <= 15) return 85;
    if (value <= 18) return 70;
    if (value <= 22) return 55;
    if (value <= 28) return 35;
    if (value <= 35) return 20;
    return 0;
  },

  putCallRatio: (ratio: number) => {
    if (ratio >= 1.3) return 90;
    if (ratio >= 1.1) return 75;
    if (ratio >= 0.9) return 60;
    if (ratio >= 0.7) return 50;
    if (ratio >= 0.6) return 40;
    if (ratio >= 0.5) return 25;
    return 10;
  },

  vixTermStructure: (isContango: boolean) => (isContango ? 70 : 30),

  yieldCurve10Y2Y: (spread: number) => {
    if (spread >= 1.0) return 100;
    if (spread >= 0.5) return 85;
    if (spread >= 0.25) return 70;
    if (spread >= 0) return 55;
    if (spread >= -0.25) return 35;
    if (spread >= -0.5) return 20;
    return 0;
  },

  highYieldSpread: (spread: number) => {
    if (spread <= 2.5) return 100;
    if (spread <= 3.5) return 80;
    if (spread <= 4.5) return 60;
    if (spread <= 5.5) return 45;
    if (spread <= 7.0) return 30;
    if (spread <= 9.0) return 15;
    return 0;
  },

  investmentGradeSpread: (spread: number) => {
    if (spread <= 0.8) return 100;
    if (spread <= 1.0) return 80;
    if (spread <= 1.3) return 60;
    if (spread <= 1.6) return 45;
    if (spread <= 2.0) return 30;
    return 10;
  },

  aaiiBulls: (percent: number) => {
    if (percent <= 20) return 95;
    if (percent <= 30) return 75;
    if (percent <= 40) return 55;
    if (percent <= 50) return 40;
    if (percent <= 60) return 25;
    return 10;
  },

  aaiiBears: (percent: number) => {
    if (percent >= 50) return 95;
    if (percent >= 40) return 75;
    if (percent >= 30) return 55;
    if (percent >= 25) return 45;
    if (percent >= 20) return 30;
    return 15;
  },

  fearGreedIndex: (value: number) => {
    if (value <= 10) return 95;
    if (value <= 25) return 80;
    if (value <= 40) return 60;
    if (value <= 60) return 50;
    if (value <= 75) return 35;
    if (value <= 90) return 20;
    return 5;
  },

  globalPMI: (value: number) => {
    if (value >= 57) return 100;
    if (value >= 54) return 80;
    if (value >= 51) return 65;
    if (value >= 50) return 50;
    if (value >= 48) return 35;
    if (value >= 45) return 20;
    return 0;
  },

  vstoxx: (value: number) => {
    if (value <= 12) return 100;
    if (value <= 15) return 85;
    if (value <= 18) return 70;
    if (value <= 22) return 55;
    if (value <= 28) return 35;
    return 15;
  },
};
