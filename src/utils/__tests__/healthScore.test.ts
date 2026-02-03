import { describe, it, expect, beforeEach } from 'vitest';
import { calculateHealthScore, saveYesterdayScore, getYesterdayScore } from '../healthScore';
import { Instrument } from '@/types/market';

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

global.localStorage = localStorageMock as any;

describe('calculateHealthScore', () => {
  it('returns neutral score when data is missing', () => {
    const result = calculateHealthScore({});

    expect(result.score).toBe(50);
    expect(result.status).toBe('neutral');
    expect(result.description).toBe('Insufficient data available');
    expect(result.components).toEqual({
      marketDirection: 50,
      riskAppetite: 50,
      volatility: 50
    });
  });

  it('returns neutral score when required instruments are missing', () => {
    const instruments: Record<string, Instrument> = {
      'SPY': createMockInstrument('SPY', 500, 0.5),
      // Missing QQQ, IWM, VIX
    };

    const result = calculateHealthScore(instruments);

    expect(result.score).toBe(50);
    expect(result.status).toBe('neutral');
  });

  it('calculates score correctly with valid bullish data', () => {
    const instruments: Record<string, Instrument> = {
      'SPY': createMockInstrument('SPY', 500, 1.0),    // Up 1%
      'QQQ': createMockInstrument('QQQ', 400, 1.2),    // Up 1.2%
      'IWM': createMockInstrument('IWM', 200, 1.5),    // Up 1.5% (outperforming)
      'VIX': createMockInstrument('VIX', 15, 0, 15),   // Low VIX
    };

    const result = calculateHealthScore(instruments);

    // With positive market, risk-on, and low VIX, score should be >50
    expect(result.score).toBeGreaterThan(50);
    expect(result.status).toMatch(/healthy/);
    expect(result.components.marketDirection).toBeGreaterThan(50);
    expect(result.components.riskAppetite).toBeGreaterThan(50);
    expect(result.components.volatility).toBeGreaterThan(50);
  });

  it('calculates score correctly with valid bearish data', () => {
    const instruments: Record<string, Instrument> = {
      'SPY': createMockInstrument('SPY', 500, -1.5),   // Down 1.5%
      'QQQ': createMockInstrument('QQQ', 400, -2.0),   // Down 2%
      'IWM': createMockInstrument('IWM', 200, -2.5),   // Down 2.5% (underperforming)
      'VIX': createMockInstrument('VIX', 30, 0, 30),   // High VIX
    };

    const result = calculateHealthScore(instruments);

    // With negative market, risk-off, and high VIX, score should be <50
    expect(result.score).toBeLessThan(50);
    expect(result.status).toMatch(/unhealthy/);
    expect(result.components.marketDirection).toBeLessThan(50);
    expect(result.components.riskAppetite).toBeLessThan(50);
    expect(result.components.volatility).toBeLessThan(50);
  });

  it('handles VIX ticker variation (^VIX)', () => {
    const instruments: Record<string, Instrument> = {
      'SPY': createMockInstrument('SPY', 500, 1.5),
      'QQQ': createMockInstrument('QQQ', 400, 1.5),
      'IWM': createMockInstrument('IWM', 200, 1.5),
      '^VIX': createMockInstrument('^VIX', 15, 0, 15), // Alternative ticker
    };

    const result = calculateHealthScore(instruments);

    // Should work with ^VIX ticker and produce a healthy score
    expect(result.score).toBeGreaterThan(50);
    expect(result.status).toMatch(/healthy/);
    expect(result.components.volatility).toBeGreaterThan(0);
  });

  it('clamps score to 0-100 range', () => {
    // Extreme bullish scenario
    const bullishInstruments: Record<string, Instrument> = {
      'SPY': createMockInstrument('SPY', 500, 5.0),    // Extreme gain
      'QQQ': createMockInstrument('QQQ', 400, 5.0),
      'IWM': createMockInstrument('IWM', 200, 6.0),
      'VIX': createMockInstrument('VIX', 10, 0, 10),   // Very low VIX
    };

    const bullishResult = calculateHealthScore(bullishInstruments);
    expect(bullishResult.score).toBeGreaterThanOrEqual(0);
    expect(bullishResult.score).toBeLessThanOrEqual(100);

    // Extreme bearish scenario
    const bearishInstruments: Record<string, Instrument> = {
      'SPY': createMockInstrument('SPY', 500, -5.0),   // Extreme loss
      'QQQ': createMockInstrument('QQQ', 400, -5.0),
      'IWM': createMockInstrument('IWM', 200, -6.0),
      'VIX': createMockInstrument('VIX', 35, 0, 35),   // Very high VIX
    };

    const bearishResult = calculateHealthScore(bearishInstruments);
    expect(bearishResult.score).toBeGreaterThanOrEqual(0);
    expect(bearishResult.score).toBeLessThanOrEqual(100);
  });

  it('maps score to correct status ranges', () => {
    // Test various market scenarios and verify status is appropriate
    const veryHealthy: Record<string, Instrument> = {
      'SPY': createMockInstrument('SPY', 500, 2.0),
      'QQQ': createMockInstrument('QQQ', 400, 2.2),
      'IWM': createMockInstrument('IWM', 200, 2.5),
      'VIX': createMockInstrument('VIX', 12, 0, 12),
    };

    const healthy: Record<string, Instrument> = {
      'SPY': createMockInstrument('SPY', 500, 0.8),
      'QQQ': createMockInstrument('QQQ', 400, 0.9),
      'IWM': createMockInstrument('IWM', 200, 1.0),
      'VIX': createMockInstrument('VIX', 16, 0, 16),
    };

    const unhealthy: Record<string, Instrument> = {
      'SPY': createMockInstrument('SPY', 500, -1.2),
      'QQQ': createMockInstrument('QQQ', 400, -1.5),
      'IWM': createMockInstrument('IWM', 200, -2.0),
      'VIX': createMockInstrument('VIX', 28, 0, 28),
    };

    const veryUnhealthy: Record<string, Instrument> = {
      'SPY': createMockInstrument('SPY', 500, -2.3),
      'QQQ': createMockInstrument('QQQ', 400, -2.5),
      'IWM': createMockInstrument('IWM', 200, -3.0),
      'VIX': createMockInstrument('VIX', 33, 0, 33),
    };

    expect(calculateHealthScore(veryHealthy).status).toMatch(/healthy/);
    expect(calculateHealthScore(healthy).status).toMatch(/healthy|neutral/);
    expect(calculateHealthScore(unhealthy).status).toMatch(/unhealthy|neutral/);
    expect(calculateHealthScore(veryUnhealthy).status).toMatch(/unhealthy/);
  });

  it('generates appropriate descriptions', () => {
    const instruments: Record<string, Instrument> = {
      'SPY': createMockInstrument('SPY', 500, 1.5),
      'QQQ': createMockInstrument('QQQ', 400, 1.5),
      'IWM': createMockInstrument('IWM', 200, 1.5),
      'VIX': createMockInstrument('VIX', 15, 0, 15),
    };

    const result = calculateHealthScore(instruments);

    expect(result.description).toBeTruthy();
    expect(typeof result.description).toBe('string');
    expect(result.description.length).toBeGreaterThan(0);
  });
});

describe('Historical Score Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('saveYesterdayScore stores score with date', () => {
    saveYesterdayScore(75);

    const stored = localStorage.getItem('health-score-yesterday');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.score).toBe(75);
    expect(parsed.date).toBeTruthy();
  });

  it('getYesterdayScore returns null when no data exists', () => {
    const result = getYesterdayScore();
    expect(result).toBeNull();
  });

  it('getYesterdayScore returns null for stale data', () => {
    // Save with an old date
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 3); // 3 days ago

    localStorage.setItem('health-score-yesterday', JSON.stringify({
      score: 80,
      date: oldDate.toISOString().split('T')[0]
    }));

    const result = getYesterdayScore();
    expect(result).toBeNull();
  });

  it('getYesterdayScore handles corrupted data gracefully', () => {
    localStorage.setItem('health-score-yesterday', 'invalid json');

    const result = getYesterdayScore();
    expect(result).toBeNull();
  });

  it('saveYesterdayScore handles localStorage errors gracefully', () => {
    // Mock localStorage.setItem to throw
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('Quota exceeded');
    };

    // Should not throw
    expect(() => saveYesterdayScore(75)).not.toThrow();

    // Restore
    localStorage.setItem = originalSetItem;
  });
});

// Helper function to create mock instruments
function createMockInstrument(
  ticker: string,
  price: number,
  changePercent: number,
  currentPrice?: number
): Instrument {
  return {
    ticker,
    name: ticker,
    currentPrice: currentPrice ?? price,
    change: (price * changePercent) / 100,
    changePercent,
    previousClose: price,
    tier: 1,
    category: 'index',
    sparkline: [],
    health: 'neutral',
    tooltip: '',
    lastFetched: new Date().toISOString(),
  };
}