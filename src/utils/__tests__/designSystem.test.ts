import { describe, it, expect } from 'vitest';
import { getSignalStrength, colors } from '../designSystem';

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
