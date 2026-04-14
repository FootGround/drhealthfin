/**
 * Pillar Calculation — Converts raw market data into scored pillars
 * and a weighted composite score.
 */

import { MarketCompassRawData, Pillars } from '@/types/marketCompass';
import { scoringRules } from './scoringRules';

export const calculatePillarScores = (rawData: MarketCompassRawData): Pillars => {
  const pillars: Pillars = {
    direction: {
      weight: 0.25,
      signals: [
        {
          name: 'S&P 500 vs 200MA',
          ticker: 'SPY',
          rawValue: rawData.spy.percentVs200MA,
          displayValue: `${rawData.spy.percentVs200MA >= 0 ? '+' : ''}${rawData.spy.percentVs200MA.toFixed(1)}%`,
          change: rawData.spy.dailyChange,
          score: scoringRules.priceVs200MA(rawData.spy.percentVs200MA),
          threshold: '> 0% = above trend',
        },
        {
          name: 'Nasdaq vs 200MA',
          ticker: 'QQQ',
          rawValue: rawData.qqq.percentVs200MA,
          displayValue: `${rawData.qqq.percentVs200MA >= 0 ? '+' : ''}${rawData.qqq.percentVs200MA.toFixed(1)}%`,
          change: rawData.qqq.dailyChange,
          score: scoringRules.priceVs200MA(rawData.qqq.percentVs200MA),
          threshold: '> 0% = above trend',
        },
        {
          name: 'Russell 2000 vs 200MA',
          ticker: 'IWM',
          rawValue: rawData.iwm.percentVs200MA,
          displayValue: `${rawData.iwm.percentVs200MA >= 0 ? '+' : ''}${rawData.iwm.percentVs200MA.toFixed(1)}%`,
          change: rawData.iwm.dailyChange,
          score: scoringRules.priceVs200MA(rawData.iwm.percentVs200MA),
          threshold: '> 0% = above trend',
        },
      ],
      score: 0,
    },

    breadth: {
      weight: 0.2,
      signals: [
        {
          name: 'Advance/Decline',
          ticker: 'NYSE',
          rawValue: rawData.breadth.advancers / (rawData.breadth.advancers + rawData.breadth.decliners || 1),
          displayValue: `${rawData.breadth.advancers.toLocaleString()} / ${rawData.breadth.decliners.toLocaleString()}`,
          change: null,
          score: scoringRules.advanceDeclineRatio(rawData.breadth.advancers, rawData.breadth.decliners),
          threshold: '> 50% advancing = healthy',
        },
        {
          name: '% Above 200-Day MA',
          ticker: 'SPX',
          rawValue: rawData.breadth.percentAbove200MA,
          displayValue: `${rawData.breadth.percentAbove200MA}%`,
          change: rawData.breadth.percentAbove200MAChange,
          score: scoringRules.percentAbove200MA(rawData.breadth.percentAbove200MA),
          threshold: '> 60% = strong breadth',
        },
        {
          name: 'New Highs vs Lows',
          ticker: 'NYSE',
          rawValue: rawData.breadth.newHighs / (rawData.breadth.newLows || 1),
          displayValue: `${rawData.breadth.newHighs} / ${rawData.breadth.newLows}`,
          change: null,
          score: scoringRules.newHighsVsLows(rawData.breadth.newHighs, rawData.breadth.newLows),
          threshold: 'Highs > Lows = bullish',
        },
      ],
      score: 0,
    },

    volatility: {
      weight: 0.15,
      signals: [
        {
          name: 'VIX',
          ticker: 'VIX',
          rawValue: rawData.vix.value,
          displayValue: rawData.vix.value.toFixed(2),
          change: rawData.vix.dailyChange,
          score: scoringRules.vix(rawData.vix.value),
          threshold: '< 20 = calm markets',
        },
        {
          name: 'Put/Call Ratio',
          ticker: 'CBOE',
          rawValue: rawData.putCall.ratio,
          displayValue: rawData.putCall.ratio.toFixed(2),
          change: rawData.putCall.change,
          score: scoringRules.putCallRatio(rawData.putCall.ratio),
          threshold: '0.7–1.0 = balanced',
        },
        {
          name: 'VIX Term Structure',
          ticker: 'VIX',
          rawValue: rawData.vix.isContango,
          displayValue: rawData.vix.isContango ? 'Contango' : 'Backwardation',
          change: null,
          score: scoringRules.vixTermStructure(rawData.vix.isContango),
          threshold: 'Contango = normal',
        },
      ],
      score: 0,
    },

    credit: {
      weight: 0.15,
      signals: [
        {
          name: 'Yield Curve (10Y-2Y)',
          ticker: 'FRED',
          rawValue: rawData.yieldCurve.spread,
          displayValue: `${rawData.yieldCurve.spread >= 0 ? '+' : ''}${rawData.yieldCurve.spread.toFixed(2)}%`,
          change: rawData.yieldCurve.change,
          score: scoringRules.yieldCurve10Y2Y(rawData.yieldCurve.spread),
          threshold: 'Positive = no recession signal',
        },
        {
          name: 'High Yield Spread',
          ticker: 'HYG',
          rawValue: rawData.credit.hySpread,
          displayValue: `${rawData.credit.hySpread.toFixed(2)}%`,
          change: rawData.credit.hySpreadChange,
          score: scoringRules.highYieldSpread(rawData.credit.hySpread),
          threshold: '< 4% = healthy',
        },
        {
          name: 'IG Spread',
          ticker: 'LQD',
          rawValue: rawData.credit.igSpread,
          displayValue: `${rawData.credit.igSpread.toFixed(2)}%`,
          change: rawData.credit.igSpreadChange,
          score: scoringRules.investmentGradeSpread(rawData.credit.igSpread),
          threshold: '< 1.5% = normal',
        },
      ],
      score: 0,
    },

    sentiment: {
      weight: 0.1,
      signals: [
        {
          name: 'AAII Bulls',
          ticker: 'AAII',
          rawValue: rawData.sentiment.bulls,
          displayValue: `${rawData.sentiment.bulls.toFixed(1)}%`,
          change: rawData.sentiment.bullsChange,
          score: scoringRules.aaiiBulls(rawData.sentiment.bulls),
          threshold: '< 40% = room to run',
        },
        {
          name: 'AAII Bears',
          ticker: 'AAII',
          rawValue: rawData.sentiment.bears,
          displayValue: `${rawData.sentiment.bears.toFixed(1)}%`,
          change: rawData.sentiment.bearsChange,
          score: scoringRules.aaiiBears(rawData.sentiment.bears),
          threshold: '> 30% = healthy fear',
        },
        {
          name: 'Fear & Greed',
          ticker: 'CNN',
          rawValue: rawData.sentiment.fearGreed,
          displayValue: rawData.sentiment.fearGreed.toString(),
          change: rawData.sentiment.fearGreedChange,
          score: scoringRules.fearGreedIndex(rawData.sentiment.fearGreed),
          threshold: '< 50 = opportunity',
        },
      ],
      score: 0,
    },

    global: {
      weight: 0.15,
      signals: [
        {
          name: 'MSCI World',
          ticker: 'ACWI',
          rawValue: rawData.global.acwi.percentVs50MA,
          displayValue: `${rawData.global.acwi.percentVs50MA >= 0 ? '+' : ''}${rawData.global.acwi.percentVs50MA.toFixed(1)}%`,
          change: rawData.global.acwi.dailyChange,
          score: scoringRules.priceVs200MA(rawData.global.acwi.percentVs50MA),
          threshold: '> 0% = above trend',
        },
        {
          name: 'VSTOXX',
          ticker: 'VSTOXX',
          rawValue: rawData.global.vstoxx.value,
          displayValue: rawData.global.vstoxx.value.toFixed(2),
          change: rawData.global.vstoxx.change,
          score: scoringRules.vstoxx(rawData.global.vstoxx.value),
          threshold: '< 20 = calm Europe',
        },
        {
          name: 'Global PMI',
          ticker: 'PMI',
          rawValue: rawData.global.pmi.value,
          displayValue: rawData.global.pmi.value.toFixed(1),
          change: rawData.global.pmi.change,
          score: scoringRules.globalPMI(rawData.global.pmi.value),
          threshold: '> 50 = expansion',
        },
      ],
      score: 0,
    },
  };

  // Calculate pillar scores as average of signal scores
  Object.values(pillars).forEach((pillar) => {
    const signalScores = pillar.signals.map((s: { score: number }) => s.score);
    pillar.score = Math.round(signalScores.reduce((a: number, b: number) => a + b, 0) / signalScores.length);
  });

  return pillars;
};

export const calculateCompositeScore = (pillars: Pillars): number => {
  let totalScore = 0;
  let totalWeight = 0;

  Object.values(pillars).forEach((pillar) => {
    totalScore += pillar.score * pillar.weight;
    totalWeight += pillar.weight;
  });

  return Math.round(totalScore / totalWeight);
};
