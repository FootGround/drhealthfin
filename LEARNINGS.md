# Local Learnings - Financial Dashboard Development

This document captures learnings and patterns discovered during development to help maintain consistency and efficiency in future iterations.

---

## Story 1: Signal Strength Indicator (Completed 2026-02-05)

### What Was Built
- **Design System** (`src/utils/designSystem.ts`): Shared colors, typography, spacing constants from PRD
- **getSignalStrength()**: Pure function returning level (1-3), label, color, description, frequency
- **SignalStrengthBar**: 3-bar visual component with accessibility support
- **Integration**: Added below hero score on home view

### Architecture Decisions
1. **Shared design system file** over inline constants - better for future stories
2. **IIFE pattern** for signal strength JSX to keep component clean: `{(() => { ... })()}`
3. **ARIA attributes** for accessibility: `role="status"` and `aria-label` for screen readers

### Testing Approach
- **20 unit tests** covering all 5 score bands and edge cases
- Tests verify: level, label, color, description, frequency for each band
- Edge cases: negative scores, scores >100

### Files Changed
```
src/utils/designSystem.ts          (NEW - 145 lines)
src/utils/__tests__/designSystem.test.ts (NEW - 134 lines)
src/components/MarketCompassV6.tsx (MODIFIED - +98 lines)
```

### Gotchas & Tips
- **Color palette**: PRD uses different colors than existing component - used `dsColors` import alias
- **Spacing values**: PRD uses pixel strings ('4px', '8px') not numbers
- **TypeScript**: Use `as const` for literal types (e.g., `textTransform: 'uppercase' as const`)

### Score Bands Reference
| Score | Level | Label | Color |
|-------|-------|-------|-------|
| 0-30 | 3 | Strong Defensive | #EF4444 |
| 31-40 | 2 | Defensive | #F97316 |
| 41-60 | 1 | Neutral | #71717A |
| 61-70 | 2 | Constructive | #22C55E |
| 71-100 | 3 | Strong Offensive | #10B981 |

---

## Story 2: Data Persistence Infrastructure (Completed 2026-02-05)

### What Was Built
- **scoreHistory.ts** (`src/utils/scoreHistory.ts`): localStorage persistence for historical scores
- **saveScore()**: Saves composite + pillar scores, handles same-day updates
- **getPercentile30d()**: Calculates 30-day percentile ranking
- **getHistoryLength()**: Returns days of history (for "Building X/30 days" UI)
- **Integration**: Auto-save via useEffect in MarketCompassV6

### Architecture Decisions
1. **localStorage over IndexedDB** - simpler, sufficient for 60 days of data
2. **Date as string key** (`YYYY-MM-DD`) - avoids timezone issues
3. **Newest-first sorting** - faster access to recent data for percentile
4. **Graceful degradation** - quota exceeded → trim to 30 days → silently fail

### Testing Approach
- **30 unit tests** covering all functions and edge cases
- **Mock localStorage** with custom implementation (Vitest doesn't have jsdom by default)
- **vi.useFakeTimers()** for date manipulation
- Tests verify: save, replace, trim, percentile calculation, error handling

### Files Changed
```
src/utils/scoreHistory.ts               (NEW - 133 lines)
src/utils/__tests__/scoreHistory.test.ts (NEW - 340 lines)
src/components/MarketCompassV6.tsx      (MODIFIED - +12 lines)
```

### Gotchas & Tips
- **localStorage mock**: Must create custom mock object and assign to `global.localStorage`
- **Date timezone**: Use `toISOString().split('T')[0]` for consistent date strings
- **Vitest fake timers**: Call `vi.setSystemTime(new Date(...))` to control Date.now()
- **Error handling**: Wrap all localStorage access in try/catch

### API Reference
```typescript
saveScore(compositeScore: number, pillarScores: Record<string, number>): void
getPercentile30d(todayScore: number): number | null  // null if <30 days
getHistoryLength(): number
getLast30Scores(): number[]  // Chronological order (oldest first)
clearHistory(): void
```

### localStorage Structure
```typescript
// Key: 'marketCompass_scoreHistory'
// Value: Array<ScoreEntry> (max 60 entries, newest first)
interface ScoreEntry {
  date: string;    // 'YYYY-MM-DD'
  composite: number;
  pillars: Record<string, number>;
}
```

---

## Codebase Patterns

### Component Structure
- Main component: `MarketCompassV6.tsx`
- Inline styling with dynamic `c` color object
- Views: 'home' | 'details'
- State: `useState` for view, theme, expanded pillar

### Scoring Logic
- All scoring in `scoringRules` object (lines 9-150)
- Each function: raw value → 0-100 score
- Pure functions, easily testable

### Testing Framework
- **Vitest** with React Testing Library
- Test location: `src/utils/__tests__/`
- Run: `npm test -- --run`

### Build & Deploy
- Build: `npm run build` (TypeScript + Vite)
- Deploy: Automatic on push to main via GitHub Actions
- Output: GitHub Pages

---

## Future Stories Dependencies

| Story | Depends On | Notes |
|-------|------------|-------|
| 3. Percentile | Story 2 (Data Persistence) | ✅ Ready - Story 2 complete |
| 6. Formula UI | Story 5 (Formula Infrastructure) | Need formulas documented first |

---

## Quick Commands
```bash
npm test -- --run                    # Run all tests
npm test -- --run src/utils/__tests__/designSystem.test.ts  # Run specific test
npm run build                        # Build production
npm run dev                          # Start dev server
```
