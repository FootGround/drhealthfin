import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackEvent } from '../analytics';

// Mock navigator for Node environment
const navigatorMock = { doNotTrack: null as string | null };
Object.defineProperty(globalThis, 'navigator', {
  value: navigatorMock,
  writable: true,
  configurable: true,
});

// Mock window for Node environment
if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { innerWidth: 1024 },
    writable: true,
    configurable: true,
  });
}

describe('analytics', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    navigatorMock.doNotTrack = null;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('trackEvent does not throw', () => {
    expect(() => trackEvent('test_event')).not.toThrow();
  });

  test('trackEvent accepts properties', () => {
    expect(() =>
      trackEvent('test_event', { compositeScore: 58, signalStrength: 'Neutral' })
    ).not.toThrow();
  });

  test('trackEvent respects Do Not Track', () => {
    navigatorMock.doNotTrack = '1';
    trackEvent('test_event', { compositeScore: 58 });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test('trackEvent handles empty properties', () => {
    expect(() => trackEvent('test_event', {})).not.toThrow();
  });

  test('trackEvent handles no properties', () => {
    expect(() => trackEvent('test_event')).not.toThrow();
  });

  test('trackEvent handles complex properties', () => {
    expect(() =>
      trackEvent('formula_tooltip_opened', {
        signalKey: 'vix',
        compositeScore: 58,
        signalScore: 70,
        pillarKey: 'volatility',
      })
    ).not.toThrow();
  });

  test('trackEvent with numeric values', () => {
    expect(() =>
      trackEvent('pillar_agreement_viewed', {
        compositeScore: 58,
        bullishCount: 3,
        neutralCount: 2,
        bearishCount: 1,
      })
    ).not.toThrow();
  });

  test('multiple sequential trackEvent calls work', () => {
    expect(() => {
      trackEvent('signal_strength_viewed', { compositeScore: 58 });
      trackEvent('percentile_viewed', { compositeScore: 58, percentile: 48 });
      trackEvent('pillar_expanded', { pillarKey: 'direction' });
    }).not.toThrow();
  });
});
