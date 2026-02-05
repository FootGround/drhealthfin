import { describe, it, expect } from 'vitest';
import { getSignalStrength, colors, getOrdinalSuffix, formatOrdinal } from '../designSystem';

describe('getSignalStrength', () => {
  describe('Strong Defensive (0-30)', () => {
    it('returns Strong Defensive for score 0', () => {
      const result = getSignalStrength(0);
      expect(result.level).toBe(3);
      expect(result.label).toBe('Strong Defensive');
      expect(result.color).toBe(colors.signal.strongDefense);
    });

    it('returns Strong Defensive for score 10', () => {
      const result = getSignalStrength(10);
      expect(result.level).toBe(3);
      expect(result.label).toBe('Strong Defensive');
      expect(result.color).toBe(colors.signal.strongDefense);
    });

    it('returns Strong Defensive for score 30 (boundary)', () => {
      const result = getSignalStrength(30);
      expect(result.level).toBe(3);
      expect(result.label).toBe('Strong Defensive');
    });
  });

  describe('Defensive (31-40)', () => {
    it('returns Defensive for score 31', () => {
      const result = getSignalStrength(31);
      expect(result.level).toBe(2);
      expect(result.label).toBe('Defensive');
      expect(result.color).toBe(colors.signal.defense);
    });

    it('returns Defensive for score 35', () => {
      const result = getSignalStrength(35);
      expect(result.level).toBe(2);
      expect(result.label).toBe('Defensive');
    });

    it('returns Defensive for score 40 (boundary)', () => {
      const result = getSignalStrength(40);
      expect(result.level).toBe(2);
      expect(result.label).toBe('Defensive');
    });
  });

  describe('Neutral (41-60)', () => {
    it('returns Neutral for score 41', () => {
      const result = getSignalStrength(41);
      expect(result.level).toBe(1);
      expect(result.label).toBe('Neutral');
      expect(result.color).toBe(colors.signal.neutral);
    });

    it('returns Neutral for score 50', () => {
      const result = getSignalStrength(50);
      expect(result.level).toBe(1);
      expect(result.label).toBe('Neutral');
      expect(result.description).toBe('No directional bias');
      expect(result.frequency).toBe('~50% of days');
    });

    it('returns Neutral for score 60 (boundary)', () => {
      const result = getSignalStrength(60);
      expect(result.level).toBe(1);
      expect(result.label).toBe('Neutral');
    });
  });

  describe('Constructive (61-70)', () => {
    it('returns Constructive for score 61', () => {
      const result = getSignalStrength(61);
      expect(result.level).toBe(2);
      expect(result.label).toBe('Constructive');
      expect(result.color).toBe(colors.signal.constructive);
    });

    it('returns Constructive for score 65', () => {
      const result = getSignalStrength(65);
      expect(result.level).toBe(2);
      expect(result.label).toBe('Constructive');
    });

    it('returns Constructive for score 70 (boundary)', () => {
      const result = getSignalStrength(70);
      expect(result.level).toBe(2);
      expect(result.label).toBe('Constructive');
    });
  });

  describe('Strong Offensive (71-100)', () => {
    it('returns Strong Offensive for score 71', () => {
      const result = getSignalStrength(71);
      expect(result.level).toBe(3);
      expect(result.label).toBe('Strong Offensive');
      expect(result.color).toBe(colors.signal.strongOffense);
    });

    it('returns Strong Offensive for score 85', () => {
      const result = getSignalStrength(85);
      expect(result.level).toBe(3);
      expect(result.label).toBe('Strong Offensive');
    });

    it('returns Strong Offensive for score 100', () => {
      const result = getSignalStrength(100);
      expect(result.level).toBe(3);
      expect(result.label).toBe('Strong Offensive');
      expect(result.description).toBe('Extreme optimism — watch for reversal');
    });
  });

  describe('Edge cases', () => {
    it('handles negative scores as Strong Defensive', () => {
      const result = getSignalStrength(-5);
      expect(result.level).toBe(3);
      expect(result.label).toBe('Strong Defensive');
    });

    it('handles scores above 100 as Strong Offensive', () => {
      const result = getSignalStrength(105);
      expect(result.level).toBe(3);
      expect(result.label).toBe('Strong Offensive');
    });
  });

  describe('Return structure', () => {
    it('returns all required fields', () => {
      const result = getSignalStrength(50);
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('color');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('frequency');
    });

    it('level is always 1, 2, or 3', () => {
      const testScores = [0, 25, 35, 50, 65, 85, 100];
      testScores.forEach((score) => {
        const result = getSignalStrength(score);
        expect([1, 2, 3]).toContain(result.level);
      });
    });

    it('color is always a valid hex color', () => {
      const testScores = [0, 35, 50, 65, 85];
      testScores.forEach((score) => {
        const result = getSignalStrength(score);
        expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });
});

describe('Ordinal Formatting', () => {
  describe('getOrdinalSuffix', () => {
    it('returns "st" for 1', () => {
      expect(getOrdinalSuffix(1)).toBe('st');
    });

    it('returns "nd" for 2', () => {
      expect(getOrdinalSuffix(2)).toBe('nd');
    });

    it('returns "rd" for 3', () => {
      expect(getOrdinalSuffix(3)).toBe('rd');
    });

    it('returns "th" for 4-10', () => {
      expect(getOrdinalSuffix(4)).toBe('th');
      expect(getOrdinalSuffix(5)).toBe('th');
      expect(getOrdinalSuffix(10)).toBe('th');
    });

    it('returns "th" for 11, 12, 13 (special cases)', () => {
      expect(getOrdinalSuffix(11)).toBe('th');
      expect(getOrdinalSuffix(12)).toBe('th');
      expect(getOrdinalSuffix(13)).toBe('th');
    });

    it('returns correct suffix for 21, 22, 23', () => {
      expect(getOrdinalSuffix(21)).toBe('st');
      expect(getOrdinalSuffix(22)).toBe('nd');
      expect(getOrdinalSuffix(23)).toBe('rd');
    });

    it('returns "th" for 111, 112, 113 (special cases)', () => {
      expect(getOrdinalSuffix(111)).toBe('th');
      expect(getOrdinalSuffix(112)).toBe('th');
      expect(getOrdinalSuffix(113)).toBe('th');
    });

    it('handles 0', () => {
      expect(getOrdinalSuffix(0)).toBe('th');
    });

    it('handles percentile values 0-100', () => {
      expect(getOrdinalSuffix(48)).toBe('th');
      expect(getOrdinalSuffix(50)).toBe('th');
      expect(getOrdinalSuffix(51)).toBe('st');
      expect(getOrdinalSuffix(52)).toBe('nd');
      expect(getOrdinalSuffix(53)).toBe('rd');
      expect(getOrdinalSuffix(100)).toBe('th');
    });
  });

  describe('formatOrdinal', () => {
    it('formats 1 as "1st"', () => {
      expect(formatOrdinal(1)).toBe('1st');
    });

    it('formats 2 as "2nd"', () => {
      expect(formatOrdinal(2)).toBe('2nd');
    });

    it('formats 3 as "3rd"', () => {
      expect(formatOrdinal(3)).toBe('3rd');
    });

    it('formats 11 as "11th"', () => {
      expect(formatOrdinal(11)).toBe('11th');
    });

    it('formats 21 as "21st"', () => {
      expect(formatOrdinal(21)).toBe('21st');
    });

    it('formats 48 as "48th"', () => {
      expect(formatOrdinal(48)).toBe('48th');
    });

    it('formats 100 as "100th"', () => {
      expect(formatOrdinal(100)).toBe('100th');
    });

    it('formats 0 as "0th"', () => {
      expect(formatOrdinal(0)).toBe('0th');
    });
  });
});
