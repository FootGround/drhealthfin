// ============================================================================
// SCORE HISTORY - Persistence for historical percentile calculations
// Based on PRD_Transparency_v3.md Story 2 specifications
// ============================================================================

export interface ScoreEntry {
  date: string; // YYYY-MM-DD format
  composite: number;
  pillars: Record<string, number>;
}

const STORAGE_KEY = 'marketCompass_scoreHistory';
const MAX_HISTORY_DAYS = 60;

/**
 * Save today's composite and pillar scores to localStorage
 * If today already exists, replaces it (handles page refreshes)
 */
export const saveScore = (
  compositeScore: number,
  pillarScores: Record<string, number>
): void => {
  try {
    const history: ScoreEntry[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    );

    const today = new Date().toISOString().split('T')[0];

    // Remove today's entry if exists (replace, don't duplicate)
    const filtered = history.filter((entry) => entry.date !== today);

    // Add today's score
    filtered.push({
      date: today,
      composite: compositeScore,
      pillars: pillarScores,
    });

    // Sort by date descending (newest first)
    filtered.sort((a, b) => b.date.localeCompare(a.date));

    // Keep only last MAX_HISTORY_DAYS
    const trimmed = filtered.slice(0, MAX_HISTORY_DAYS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    // Handle quota exceeded or localStorage unavailable
    console.warn('Failed to save score history:', error);

    // Try to free space by keeping only 30 days
    try {
      const history: ScoreEntry[] = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]'
      );
      const reduced = history.slice(0, 30);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
    } catch {
      // If still fails, silently continue (non-critical feature)
    }
  }
};

/**
 * Calculate 30-day percentile for given score
 * Returns null if insufficient history (<30 days)
 */
export const getPercentile30d = (todayScore: number): number | null => {
  try {
    const history: ScoreEntry[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    );

    if (history.length < 30) {
      return null; // Not enough data
    }

    // Get last 30 days of scores
    const last30Scores = history.slice(0, 30).map((entry) => entry.composite);

    // Count how many scores are below today's score
    const scoresBelow = last30Scores.filter((score) => score < todayScore).length;

    // Calculate percentile
    const percentile = Math.round((scoresBelow / 30) * 100);

    return percentile;
  } catch (error) {
    console.warn('Failed to calculate percentile:', error);
    return null;
  }
};

/**
 * Get current history length (for "Building history X/30 days" message)
 */
export const getHistoryLength = (): number => {
  try {
    const history: ScoreEntry[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    );
    return history.length;
  } catch {
    return 0;
  }
};

/**
 * Get last 30 days of scores (for sparkline visualization - Phase 3)
 * Returns scores in chronological order (oldest first)
 */
export const getLast30Scores = (): number[] => {
  try {
    const history: ScoreEntry[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    );
    return history.slice(0, 30).map((entry) => entry.composite).reverse();
  } catch {
    return [];
  }
};

/**
 * Get full history (for debugging/export)
 */
export const getHistory = (): ScoreEntry[] => {
  try {
    const history: ScoreEntry[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    );
    return history;
  } catch {
    return [];
  }
};

/**
 * Clear all history (for testing or user privacy)
 */
export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * Export storage key for testing
 */
export const SCORE_HISTORY_STORAGE_KEY = STORAGE_KEY;
