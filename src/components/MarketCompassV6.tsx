import { useState, useMemo, useEffect } from 'react';
import { useMarketCompassData } from '@/hooks/useMarketCompassData';
import { MarketCompassRawData, Pillars } from '@/types/marketCompass';
import { colors as dsColors, spacing, radius, getSignalStrength, formatOrdinal } from '@/utils/designSystem';
import { saveScore, getPercentile30d, getHistoryLength } from '@/utils/scoreHistory';

// ============================================================================
// SCORING FUNCTIONS — Pure functions that convert raw values to 0-100 scores
// ============================================================================

const scoringRules = {
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
    const ratio = advancers / (advancers + decliners);
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

// ============================================================================
// PILLAR CALCULATION
// ============================================================================

const calculatePillarScores = (rawData: MarketCompassRawData): Pillars => {
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
          rawValue: rawData.breadth.advancers / (rawData.breadth.advancers + rawData.breadth.decliners),
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
          rawValue: rawData.breadth.newHighs / rawData.breadth.newLows,
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

  // Calculate pillar scores
  Object.values(pillars).forEach((pillar) => {
    const signalScores = pillar.signals.map((s: { score: number }) => s.score);
    pillar.score = Math.round(signalScores.reduce((a: number, b: number) => a + b, 0) / signalScores.length);
  });

  return pillars;
};

const calculateCompositeScore = (pillars: Pillars): number => {
  let totalScore = 0;
  let totalWeight = 0;

  Object.values(pillars).forEach((pillar) => {
    totalScore += pillar.score * pillar.weight;
    totalWeight += pillar.weight;
  });

  return Math.round(totalScore / totalWeight);
};

// ============================================================================
// SIGNAL STRENGTH BAR COMPONENT
// ============================================================================

const SignalStrengthBar = ({ level, color }: { level: 1 | 2 | 3; color: string }) => (
  <div
    style={{
      display: 'flex',
      gap: '3px',
      alignItems: 'flex-end',
    }}
    role="img"
    aria-hidden="true"
  >
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        style={{
          width: '4px',
          height: i <= level ? '12px' : '8px',
          borderRadius: '2px',
          backgroundColor: i <= level ? color : dsColors.border.subtle,
          transition: 'all 0.2s ease',
        }}
      />
    ))}
  </div>
);

// ============================================================================
// PERCENTILE INDICATOR COMPONENT (Story 3)
// ============================================================================

const PercentileIndicator = ({
  percentile,
  historyLength,
}: {
  percentile: number | null;
  historyLength: number;
}) => {
  // Building state - show progress bar
  if (percentile === null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: `${spacing.sm} ${spacing.md}`,
          backgroundColor: dsColors.bg.secondary,
          borderRadius: radius.lg,
          marginTop: spacing.md,
          maxWidth: '400px',
          margin: `${spacing.md} auto 0`,
        }}
      >
        <div
          style={{
            flex: 1,
            height: '4px',
            backgroundColor: dsColors.border.subtle,
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${(historyLength / 30) * 100}%`,
              height: '100%',
              backgroundColor: dsColors.text.tertiary,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: 1.4,
            letterSpacing: '0.02em',
            color: dsColors.text.tertiary,
            whiteSpace: 'nowrap',
          }}
        >
          {historyLength}/30 days
        </span>
      </div>
    );
  }

  // Full percentile display
  return (
    <div
      style={{
        padding: `${spacing.sm} ${spacing.md}`,
        backgroundColor: dsColors.bg.secondary,
        borderRadius: radius.lg,
        marginTop: spacing.md,
        maxWidth: '400px',
        margin: `${spacing.md} auto 0`,
      }}
    >
      {/* Label Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: spacing.xs,
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: 1.4,
            letterSpacing: '0.02em',
            color: dsColors.text.tertiary,
          }}
        >
          30-Day Rank
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 1.4,
            fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace",
            fontVariantNumeric: 'tabular-nums',
            color: dsColors.accent.gold,
          }}
        >
          {formatOrdinal(percentile)} percentile
        </span>
      </div>

      {/* Percentile Bar */}
      <div
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: dsColors.border.subtle,
          borderRadius: '2px',
          position: 'relative',
        }}
      >
        {/* Marker Dot */}
        <div
          style={{
            position: 'absolute',
            left: `${percentile}%`,
            top: '-2px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: dsColors.accent.gold,
            transform: 'translateX(-50%)',
            boxShadow: `0 0 0 2px ${dsColors.bg.secondary}`,
          }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// REACT COMPONENT
// ============================================================================

const MarketCompassV6 = () => {
  const { data, isLoading, error } = useMarketCompassData();
  const [view, setView] = useState<'home' | 'details'>('home');
  const [isDark, setIsDark] = useState(true);
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

  const pillars = useMemo(() => (data ? calculatePillarScores(data) : null), [data]);
  const compositeScore = useMemo(() => (pillars ? calculateCompositeScore(pillars) : 0), [pillars]);

  // Save score to history for percentile calculations (Story 2)
  useEffect(() => {
    if (compositeScore && pillars) {
      const pillarScores = Object.fromEntries(
        Object.entries(pillars).map(([key, value]) => [key, value.score])
      );
      saveScore(compositeScore, pillarScores);
    }
  }, [compositeScore, pillars]);

  const getStatus = (score: number) => (score >= 65 ? 'healthy' : score >= 45 ? 'neutral' : 'stressed');
  const getStatusLabel = (score: number) => (score >= 65 ? 'Healthy' : score >= 45 ? 'Neutral' : 'Stressed');
  const status = getStatus(compositeScore);

  // Colors
  const c = {
    bg: isDark ? '#000000' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    muted: isDark ? '#666666' : '#888888',
    dim: isDark ? '#1a1a1a' : '#f5f5f5',
    border: isDark ? '#2a2a2a' : '#e0e0e0',
    positive: '#22c55e',
    negative: '#ef4444',
    accent: status === 'healthy' ? '#22c55e' : status === 'neutral' ? '#eab308' : '#ef4444',
  };

  const pillarLabels = {
    direction: 'Direction',
    breadth: 'Breadth',
    volatility: 'Volatility',
    credit: 'Credit',
    sentiment: 'Sentiment',
    global: 'Global',
  };

  // Loading state
  if (isLoading || !data || !pillars) {
    return (
      <div style={{ minHeight: '100vh', background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid', borderColor: `${c.border} ${c.border} ${c.accent} ${c.accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: c.muted }}>Loading market data...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: c.negative, marginBottom: '12px', fontSize: '14px' }}>⚠ {error}</p>
          <p style={{ color: c.muted, fontSize: '12px' }}>Using fallback data. Some signals may be unavailable.</p>
        </div>
      </div>
    );
  }

  // === HOME VIEW ===
  if (view === 'home') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: c.bg,
          color: c.text,
          fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif",
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <style>{`
          @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          button { font-family: inherit; cursor: pointer; }
        `}</style>

        {/* Header */}
        <header style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: c.muted }}>Market Compass</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: c.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: data.marketStatus === 'open' ? c.positive : c.negative }} />
              {data.marketStatus === 'open' ? 'Live' : 'Closed'}
            </span>
            <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', color: c.muted, fontSize: '14px' }}>
              {isDark ? '◐' : '◑'}
            </button>
          </div>
        </header>

        {/* Hero */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', animation: 'fadeUp 0.5s ease-out' }}>
          <div style={{ fontSize: 'clamp(100px, 22vw, 180px)', fontWeight: 200, lineHeight: 0.9, letterSpacing: '-0.03em', color: c.accent, fontVariantNumeric: 'tabular-nums' }}>
            {compositeScore}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: c.muted, marginTop: '12px' }}>
            {getStatusLabel(compositeScore)}
          </div>

          {/* Signal Strength Indicator */}
          {(() => {
            const signalStrength = getSignalStrength(compositeScore);
            return (
              <div
                style={{
                  marginTop: spacing.md,
                  textAlign: 'center',
                  maxWidth: '400px',
                  padding: `0 ${spacing.md}`,
                }}
                role="status"
                aria-label={`Signal strength: ${signalStrength.label}, ${signalStrength.description}`}
              >
                {/* Signal Strength Bar + Label Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <SignalStrengthBar level={signalStrength.level} color={signalStrength.color} />
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: 1.5,
                      color: signalStrength.color,
                    }}
                  >
                    {signalStrength.label}
                  </span>
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 400,
                    lineHeight: 1.5,
                    color: dsColors.text.secondary,
                    marginTop: spacing.xs,
                  }}
                >
                  {signalStrength.description}
                </div>

                {/* Frequency */}
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    lineHeight: 1.4,
                    letterSpacing: '0.02em',
                    color: dsColors.text.tertiary,
                    marginTop: spacing.xs,
                  }}
                >
                  Occurs {signalStrength.frequency}
                </div>
              </div>
            );
          })()}

          {/* 30-Day Percentile Indicator (Story 3) */}
          <PercentileIndicator
            percentile={getPercentile30d(compositeScore)}
            historyLength={getHistoryLength()}
          />

          <div style={{ fontSize: '12px', color: c.muted, marginTop: spacing.md, opacity: 0.6 }}>{data.updatedAt}</div>
        </main>

        {/* Pillar Summary Bar */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {Object.entries(pillars).map(([key, pillar]) => (
              <div key={key} style={{ flex: pillar.weight, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div
                  style={{
                    height: '4px',
                    width: '100%',
                    borderRadius: '2px',
                    background: pillar.score >= 60 ? c.positive : pillar.score >= 45 ? '#eab308' : c.negative,
                    opacity: 0.8,
                  }}
                />
                <span style={{ fontSize: '9px', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {pillarLabels[key as keyof typeof pillarLabels].slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Values Strip */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${c.border}`, overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: '20px', minWidth: 'max-content' }}>
            {[
              { label: 'SPY', value: data.spy.price.toFixed(2), change: data.spy.dailyChange },
              { label: 'VIX', value: data.vix.value.toFixed(2), change: data.vix.dailyChange },
              { label: '10Y-2Y', value: `${data.yieldCurve.spread >= 0 ? '+' : ''}${data.yieldCurve.spread.toFixed(2)}%`, change: null },
              { label: 'A/D', value: `${((data.breadth.advancers / (data.breadth.advancers + data.breadth.decliners)) * 100).toFixed(0)}%`, change: null },
              { label: 'Bulls', value: `${data.sentiment.bulls.toFixed(0)}%`, change: data.sentiment.bullsChange },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: c.muted, fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{item.value}</span>
                {item.change !== null && (
                  <span style={{ fontSize: '10px', color: item.change >= 0 ? c.positive : c.negative, fontVariantNumeric: 'tabular-nums' }}>
                    {item.change >= 0 ? '+' : ''}
                    {item.change.toFixed(1)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => setView('details')}
          style={{
            padding: '18px 20px',
            background: c.dim,
            border: 'none',
            color: c.text,
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>View all 18 signals</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    );
  }

  // === DETAILS VIEW ===
  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; cursor: pointer; }
      `}</style>

      {/* Header */}
      <header
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${c.border}`,
          position: 'sticky',
          top: 0,
          background: c.bg,
          zIndex: 10,
        }}
      >
        <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: c.text, fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
        <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', color: c.muted, fontSize: '14px' }}>
          {isDark ? '◐' : '◑'}
        </button>
      </header>

      {/* Score Summary */}
      <section style={{ padding: '24px 20px', borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '48px', fontWeight: 200, color: c.accent, lineHeight: 1 }}>{compositeScore}</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: c.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{getStatusLabel(compositeScore)}</span>
        </div>
        <p style={{ fontSize: '13px', color: c.muted }}>Weighted average of 6 pillars × 3 signals each</p>
      </section>

      {/* Pillars */}
      <section style={{ padding: '0 20px' }}>
        {Object.entries(pillars).map(([key, pillar], i) => {
          const isExpanded = expandedPillar === key;
          const pillarColor = pillar.score >= 60 ? c.positive : pillar.score >= 45 ? '#eab308' : c.negative;

          return (
            <div key={key} style={{ borderBottom: `1px solid ${c.border}`, animation: `fadeUp 0.3s ease-out ${i * 0.03}s both` }}>
              <button
                onClick={() => setExpandedPillar(isExpanded ? null : key)}
                style={{ width: '100%', padding: '16px 0', background: 'none', border: 'none', color: c.text, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{pillarLabels[key as keyof typeof pillarLabels]}</span>
                  <span style={{ fontSize: '10px', color: c.muted, background: c.dim, padding: '2px 6px', borderRadius: '4px' }}>{(pillar.weight * 100).toFixed(0)}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 400, color: pillarColor, fontVariantNumeric: 'tabular-nums' }}>{pillar.score}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth="2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div style={{ paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pillar.signals.map((signal: any, j: number) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: c.dim, borderRadius: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          {signal.name}
                          <span style={{ fontSize: '9px', color: c.muted, background: c.border, padding: '2px 4px', borderRadius: '3px' }}>{signal.ticker}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: c.muted }}>{signal.threshold}</div>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                        {/* Raw → Score Row (Story 4) */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'flex-end',
                          gap: spacing.sm,
                          fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace",
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: c.text }}>
                            {signal.displayValue}
                          </span>
                          <span style={{ fontSize: '13px', color: c.muted }}>→</span>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: c.muted }}>
                            {signal.score}
                          </span>
                        </div>
                        {/* Change Row */}
                        {signal.change !== null && (
                          <div style={{
                            fontSize: '10px',
                            color: signal.change >= 0 ? c.positive : c.negative,
                            fontVariantNumeric: 'tabular-nums',
                            marginTop: spacing.xs,
                          }}>
                            {signal.change >= 0 ? '+' : ''}
                            {signal.change.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Calculation Transparency */}
      <section style={{ margin: '20px', padding: '16px', background: c.dim, borderRadius: '8px' }}>
        <h3 style={{ fontSize: '10px', fontWeight: 600, color: c.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Score Calculation</h3>
        <div style={{ fontSize: '12px', fontFamily: 'SF Mono, monospace', color: c.text, lineHeight: 1.8 }}>
          {Object.entries(pillars).map(([key, pillar]) => (
            <div key={key}>
              {pillarLabels[key as keyof typeof pillarLabels]}: {pillar.score} × {(pillar.weight * 100).toFixed(0)}% = {(pillar.score * pillar.weight).toFixed(1)}
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${c.border}`, marginTop: '8px', paddingTop: '8px', fontWeight: 600 }}>Total: {compositeScore}</div>
        </div>
      </section>

      {/* Sources */}
      <section style={{ padding: '16px 20px', borderTop: `1px solid ${c.border}` }}>
        <h3 style={{ fontSize: '10px', fontWeight: 600, color: c.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Sources</h3>
        <p style={{ fontSize: '11px', color: c.muted, lineHeight: 1.6 }}>
          Yahoo Finance (prices) • CBOE (VIX, put/call) • NYSE (breadth) • FRED (yield curve, spreads) • AAII (sentiment) • S&P Global (PMI)
        </p>
      </section>

      <footer style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: c.muted }}>Not financial advice • Methodology is open source</footer>
    </div>
  );
};

export default MarketCompassV6;
