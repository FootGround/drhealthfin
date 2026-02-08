import { describe, test, expect } from 'vitest';
import { categorizePillars, getInterpretation, PillarCategories } from '../pillarAgreement';
import { Pillars } from '@/types/marketCompass';

// Helper to create mock pillars with specified scores
const makePillars = (scores: Record<string, number>): Pillars => {
  const keys = ['direction', 'breadth', 'volatility', 'credit', 'sentiment', 'global'] as const;
  const pillars: any = {};
  keys.forEach((key) => {
    pillars[key] = {
      weight: key === 'direction' ? 0.25 : key === 'breadth' ? 0.2 : key === 'sentiment' ? 0.1 : 0.15,
      signals: [],
      score: scores[key] ?? 50,
    };
  });
  return pillars as Pillars;
};

describe('pillarAgreement', () => {
  describe('categorizePillars', () => {
    test('all bullish (scores ≥ 60)', () => {
      const pillars = makePillars({
        direction: 70, breadth: 65, volatility: 80, credit: 60, sentiment: 75, global: 90,
      });
      const result = categorizePillars(pillars);
      expect(result.bullish).toHaveLength(6);
      expect(result.neutral).toHaveLength(0);
      expect(result.bearish).toHaveLength(0);
    });

    test('all neutral (scores 45-59)', () => {
      const pillars = makePillars({
        direction: 50, breadth: 55, volatility: 45, credit: 59, sentiment: 48, global: 52,
      });
      const result = categorizePillars(pillars);
      expect(result.bullish).toHaveLength(0);
      expect(result.neutral).toHaveLength(6);
      expect(result.bearish).toHaveLength(0);
    });

    test('all bearish (scores < 45)', () => {
      const pillars = makePillars({
        direction: 30, breadth: 20, volatility: 10, credit: 44, sentiment: 0, global: 40,
      });
      const result = categorizePillars(pillars);
      expect(result.bullish).toHaveLength(0);
      expect(result.neutral).toHaveLength(0);
      expect(result.bearish).toHaveLength(6);
    });

    test('mixed split (3 bullish, 2 neutral, 1 bearish)', () => {
      const pillars = makePillars({
        direction: 55, breadth: 40, volatility: 63, credit: 70, sentiment: 53, global: 63,
      });
      const result = categorizePillars(pillars);
      expect(result.bullish).toHaveLength(3);
      expect(result.neutral).toHaveLength(2);
      expect(result.bearish).toHaveLength(1);
    });

    test('boundary: score 60 is bullish', () => {
      const pillars = makePillars({ direction: 60 });
      const result = categorizePillars(pillars);
      const dirEntry = result.bullish.find(([k]) => k === 'direction');
      expect(dirEntry).toBeDefined();
      expect(dirEntry![1]).toBe(60);
    });

    test('boundary: score 45 is neutral', () => {
      const pillars = makePillars({ direction: 45 });
      const result = categorizePillars(pillars);
      const dirEntry = result.neutral.find(([k]) => k === 'direction');
      expect(dirEntry).toBeDefined();
      expect(dirEntry![1]).toBe(45);
    });

    test('boundary: score 44 is bearish', () => {
      const pillars = makePillars({ direction: 44 });
      const result = categorizePillars(pillars);
      const dirEntry = result.bearish.find(([k]) => k === 'direction');
      expect(dirEntry).toBeDefined();
      expect(dirEntry![1]).toBe(44);
    });

    test('boundary: score 59 is neutral (not bullish)', () => {
      const pillars = makePillars({ direction: 59 });
      const result = categorizePillars(pillars);
      expect(result.neutral.find(([k]) => k === 'direction')).toBeDefined();
      expect(result.bullish.find(([k]) => k === 'direction')).toBeUndefined();
    });

    test('all 6 pillars accounted for', () => {
      const pillars = makePillars({
        direction: 70, breadth: 50, volatility: 30, credit: 65, sentiment: 45, global: 80,
      });
      const result = categorizePillars(pillars);
      const total = result.bullish.length + result.neutral.length + result.bearish.length;
      expect(total).toBe(6);
    });

    test('includes correct scores in entries', () => {
      const pillars = makePillars({ credit: 72 });
      const result = categorizePillars(pillars);
      const creditEntry = result.bullish.find(([k]) => k === 'credit');
      expect(creditEntry).toBeDefined();
      expect(creditEntry![1]).toBe(72);
    });
  });

  describe('getInterpretation', () => {
    test('6 bullish → strong bullish', () => {
      const categories: PillarCategories = {
        bullish: [['a', 70], ['b', 65], ['c', 80], ['d', 60], ['e', 75], ['f', 90]],
        neutral: [],
        bearish: [],
      };
      expect(getInterpretation(categories)).toContain('Strong bullish');
    });

    test('5 bullish → strong bullish', () => {
      const categories: PillarCategories = {
        bullish: [['a', 70], ['b', 65], ['c', 80], ['d', 60], ['e', 75]],
        neutral: [['f', 55]],
        bearish: [],
      };
      expect(getInterpretation(categories)).toContain('Strong bullish');
    });

    test('4 bullish → leaning positive', () => {
      const categories: PillarCategories = {
        bullish: [['a', 70], ['b', 65], ['c', 80], ['d', 60]],
        neutral: [['e', 55], ['f', 50]],
        bearish: [],
      };
      expect(getInterpretation(categories)).toContain('Leaning positive');
    });

    test('6 bearish → strong defensive', () => {
      const categories: PillarCategories = {
        bullish: [],
        neutral: [],
        bearish: [['a', 30], ['b', 20], ['c', 10], ['d', 40], ['e', 25], ['f', 35]],
      };
      expect(getInterpretation(categories)).toContain('Strong defensive');
    });

    test('5 bearish → strong defensive', () => {
      const categories: PillarCategories = {
        bullish: [],
        neutral: [['a', 50]],
        bearish: [['b', 30], ['c', 20], ['d', 10], ['e', 40], ['f', 25]],
      };
      expect(getInterpretation(categories)).toContain('Strong defensive');
    });

    test('4 bearish → leaning negative', () => {
      const categories: PillarCategories = {
        bullish: [],
        neutral: [['a', 50], ['b', 55]],
        bearish: [['c', 30], ['d', 20], ['e', 10], ['f', 40]],
      };
      expect(getInterpretation(categories)).toContain('Leaning negative');
    });

    test('3-3 split → mixed signals', () => {
      const categories: PillarCategories = {
        bullish: [['a', 70], ['b', 65], ['c', 80]],
        neutral: [],
        bearish: [['d', 30], ['e', 20], ['f', 10]],
      };
      expect(getInterpretation(categories)).toContain('Mixed signals');
    });

    test('3-2-1 split → mixed signals', () => {
      const categories: PillarCategories = {
        bullish: [['a', 70], ['b', 65], ['c', 80]],
        neutral: [['d', 55], ['e', 50]],
        bearish: [['f', 30]],
      };
      expect(getInterpretation(categories)).toContain('Mixed signals');
    });

    test('2-2-2 split → mixed signals', () => {
      const categories: PillarCategories = {
        bullish: [['a', 70], ['b', 65]],
        neutral: [['c', 55], ['d', 50]],
        bearish: [['e', 30], ['f', 20]],
      };
      expect(getInterpretation(categories)).toContain('Mixed signals');
    });

    test('all neutral → mixed signals', () => {
      const categories: PillarCategories = {
        bullish: [],
        neutral: [['a', 50], ['b', 55], ['c', 45], ['d', 59], ['e', 48], ['f', 52]],
        bearish: [],
      };
      expect(getInterpretation(categories)).toContain('Mixed signals');
    });

    test('3 bullish 3 neutral → mixed signals (not leaning positive)', () => {
      const categories: PillarCategories = {
        bullish: [['a', 70], ['b', 65], ['c', 80]],
        neutral: [['d', 55], ['e', 50], ['f', 48]],
        bearish: [],
      };
      expect(getInterpretation(categories)).toContain('Mixed signals');
    });
  });
});
