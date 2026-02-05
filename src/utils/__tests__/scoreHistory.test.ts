import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  saveScore,
  getPercentile30d,
  getHistoryLength,
  getLast30Scores,
  getHistory,
  clearHistory,
  SCORE_HISTORY_STORAGE_KEY,
} from '../scoreHistory';

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
    },
  };
})();

global.localStorage = localStorageMock as any;

describe('scoreHistory', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('saveScore', () => {
    it('stores data in localStorage', () => {
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(58, { direction: 55, breadth: 48 });

      const stored = JSON.parse(localStorage.getItem(SCORE_HISTORY_STORAGE_KEY)!);
      expect(stored).toHaveLength(1);
      expect(stored[0].composite).toBe(58);
      expect(stored[0].date).toBe('2025-02-05');
      expect(stored[0].pillars).toEqual({ direction: 55, breadth: 48 });
    });

    it('replaces same-day entry (handles page refreshes)', () => {
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(50, { direction: 50 });
      saveScore(60, { direction: 60 });

      const stored = JSON.parse(localStorage.getItem(SCORE_HISTORY_STORAGE_KEY)!);
      expect(stored).toHaveLength(1);
      expect(stored[0].composite).toBe(60);
    });

    it('adds new entry for different day', () => {
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(50, { direction: 50 });

      vi.setSystemTime(new Date('2025-02-06'));
      saveScore(60, { direction: 60 });

      const stored = JSON.parse(localStorage.getItem(SCORE_HISTORY_STORAGE_KEY)!);
      expect(stored).toHaveLength(2);
      expect(stored[0].date).toBe('2025-02-06'); // Newest first
      expect(stored[1].date).toBe('2025-02-05');
    });

    it('sorts by date descending (newest first)', () => {
      vi.setSystemTime(new Date('2025-02-03'));
      saveScore(50, {});
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(60, {});
      vi.setSystemTime(new Date('2025-02-04'));
      saveScore(55, {});

      const stored = JSON.parse(localStorage.getItem(SCORE_HISTORY_STORAGE_KEY)!);
      expect(stored[0].date).toBe('2025-02-05');
      expect(stored[1].date).toBe('2025-02-04');
      expect(stored[2].date).toBe('2025-02-03');
    });

    it('trims to MAX_HISTORY_DAYS (60)', () => {
      // Add 70 days of data
      for (let i = 0; i < 70; i++) {
        const date = new Date('2025-02-01');
        date.setDate(date.getDate() + i);
        vi.setSystemTime(date);
        saveScore(50 + (i % 10), {});
      }

      const stored = JSON.parse(localStorage.getItem(SCORE_HISTORY_STORAGE_KEY)!);
      expect(stored.length).toBeLessThanOrEqual(60);
    });

    it('handles quota exceeded gracefully', () => {
      // Fill localStorage with existing history
      const existingHistory = Array(50).fill(null).map((_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        composite: 50,
        pillars: {},
      }));
      localStorageMock.setItem(SCORE_HISTORY_STORAGE_KEY, JSON.stringify(existingHistory));

      // Mock quota exceeded on next setItem
      const originalSetItem = localStorageMock.setItem.bind(localStorageMock);
      let callCount = 0;
      localStorageMock.setItem = (key: string, value: string) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('QuotaExceededError');
        }
        return originalSetItem(key, value);
      };

      vi.setSystemTime(new Date('2025-02-05'));

      // Should not throw
      expect(() => saveScore(50, {})).not.toThrow();

      // Restore original setItem
      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('getPercentile30d', () => {
    it('returns null when history < 30 days', () => {
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(50, {});
      expect(getPercentile30d(50)).toBeNull();
    });

    it('returns null when history is empty', () => {
      expect(getPercentile30d(50)).toBeNull();
    });

    it('calculates percentile correctly at 50th', () => {
      // Add 30 days with scores 40-69 (30 unique scores)
      for (let i = 0; i < 30; i++) {
        const date = new Date('2025-02-01');
        date.setDate(date.getDate() + i);
        vi.setSystemTime(date);
        saveScore(40 + i, {});
      }

      // Score of 55: scores below are 40-54 = 15 scores
      // Percentile: 15/30 × 100 = 50
      expect(getPercentile30d(55)).toBe(50);
    });

    it('returns 0 for lowest score', () => {
      // Add 30 days with scores 50-79
      for (let i = 0; i < 30; i++) {
        const date = new Date('2025-02-01');
        date.setDate(date.getDate() + i);
        vi.setSystemTime(date);
        saveScore(50 + i, {});
      }

      // Score of 30: no scores below it
      expect(getPercentile30d(30)).toBe(0);
    });

    it('returns 100 for highest score', () => {
      // Add 30 days with scores 40-69
      for (let i = 0; i < 30; i++) {
        const date = new Date('2025-02-01');
        date.setDate(date.getDate() + i);
        vi.setSystemTime(date);
        saveScore(40 + i, {});
      }

      // Score of 100: all 30 scores are below it
      expect(getPercentile30d(100)).toBe(100);
    });

    it('uses only last 30 days when more available', () => {
      // Add 40 days of data
      for (let i = 0; i < 40; i++) {
        const date = new Date('2025-02-01');
        date.setDate(date.getDate() + i);
        vi.setSystemTime(date);
        saveScore(40 + i, {}); // Scores: 40-79
      }

      // Last 30 days are scores 50-79 (days 11-40)
      // Score of 65: scores below are 50-64 = 15 scores
      // Percentile: 15/30 × 100 = 50
      expect(getPercentile30d(65)).toBe(50);
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem(SCORE_HISTORY_STORAGE_KEY, 'invalid json');
      expect(getPercentile30d(50)).toBeNull();
    });
  });

  describe('getHistoryLength', () => {
    it('returns 0 for empty history', () => {
      expect(getHistoryLength()).toBe(0);
    });

    it('returns correct count', () => {
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(50, {});
      vi.setSystemTime(new Date('2025-02-06'));
      saveScore(60, {});

      expect(getHistoryLength()).toBe(2);
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem(SCORE_HISTORY_STORAGE_KEY, 'invalid json');
      expect(getHistoryLength()).toBe(0);
    });
  });

  describe('getLast30Scores', () => {
    it('returns empty array for empty history', () => {
      expect(getLast30Scores()).toEqual([]);
    });

    it('returns scores in chronological order (oldest first)', () => {
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(50, {});
      vi.setSystemTime(new Date('2025-02-06'));
      saveScore(60, {});
      vi.setSystemTime(new Date('2025-02-07'));
      saveScore(70, {});

      expect(getLast30Scores()).toEqual([50, 60, 70]);
    });

    it('returns max 30 scores', () => {
      for (let i = 0; i < 40; i++) {
        const date = new Date('2025-02-01');
        date.setDate(date.getDate() + i);
        vi.setSystemTime(date);
        saveScore(40 + i, {});
      }

      const scores = getLast30Scores();
      expect(scores).toHaveLength(30);
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem(SCORE_HISTORY_STORAGE_KEY, 'invalid json');
      expect(getLast30Scores()).toEqual([]);
    });
  });

  describe('getHistory', () => {
    it('returns empty array for empty history', () => {
      expect(getHistory()).toEqual([]);
    });

    it('returns full history', () => {
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(50, { direction: 55 });

      const history = getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({
        date: '2025-02-05',
        composite: 50,
        pillars: { direction: 55 },
      });
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem(SCORE_HISTORY_STORAGE_KEY, 'invalid json');
      expect(getHistory()).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('removes all history', () => {
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(50, {});
      expect(getHistoryLength()).toBe(1);

      clearHistory();
      expect(getHistoryLength()).toBe(0);
      expect(localStorage.getItem(SCORE_HISTORY_STORAGE_KEY)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles different days correctly', () => {
      // Day 1
      vi.setSystemTime(new Date('2025-02-05T12:00:00Z'));
      saveScore(50, {});

      // Day 2
      vi.setSystemTime(new Date('2025-02-06T12:00:00Z'));
      saveScore(60, {});

      expect(getHistoryLength()).toBe(2);
    });

    it('handles score of 0', () => {
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(0, {});

      const history = getHistory();
      expect(history[0].composite).toBe(0);
    });

    it('handles score of 100', () => {
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(100, {});

      const history = getHistory();
      expect(history[0].composite).toBe(100);
    });

    it('handles empty pillars object', () => {
      vi.setSystemTime(new Date('2025-02-05'));
      saveScore(50, {});

      const history = getHistory();
      expect(history[0].pillars).toEqual({});
    });

    it('boundary: exactly 30 days returns valid percentile', () => {
      for (let i = 0; i < 30; i++) {
        const date = new Date('2025-02-01');
        date.setDate(date.getDate() + i);
        vi.setSystemTime(date);
        saveScore(50, {});
      }

      expect(getPercentile30d(50)).not.toBeNull();
      expect(getPercentile30d(50)).toBe(0); // All scores are equal, none below
    });

    it('boundary: 29 days returns null', () => {
      for (let i = 0; i < 29; i++) {
        const date = new Date('2025-02-01');
        date.setDate(date.getDate() + i);
        vi.setSystemTime(date);
        saveScore(50, {});
      }

      expect(getPercentile30d(50)).toBeNull();
    });
  });
});
