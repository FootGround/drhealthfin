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

## Story 3: 30-Day Percentile Display (Completed 2026-02-05)

### What Was Built
- **Ordinal Helpers** in `designSystem.ts`: `getOrdinalSuffix()`, `formatOrdinal()`
- **PercentileIndicator**: Component with two states (building vs full)
- **Integration**: Added below Signal Strength on home view

### Architecture Decisions
1. **Two-state component** - Building state shows progress, full state shows percentile
2. **Gold accent color** (#EAB308) for percentile - distinct from signal colors
3. **Marker dot on bar** - visual position indicator at percentile %

### Testing Approach
- **17 new tests** for ordinal formatting
- Tests cover: 1st, 2nd, 3rd, 11th/12th/13th (special), 21st/22nd/23rd, 100th

### Files Changed
```
src/utils/designSystem.ts               (MODIFIED - +23 lines)
src/utils/__tests__/designSystem.test.ts (MODIFIED - +89 lines)
src/components/MarketCompassV6.tsx      (MODIFIED - +143 lines)
```

### Gotchas & Tips
- **11/12/13 special case**: Always use "th" even though they end in 1/2/3
- **CSS position**: Marker dot uses `left: ${percentile}%` + `transform: translateX(-50%)`
- **Box shadow ring**: Creates ring effect around marker dot

### Component States
```
Building State (historyLength < 30):
┌──────────────────────────────────────────┐
│  ━━━━━━━━━━━━━━━━━━━━━━━━               │
│                           15/30 days     │
└──────────────────────────────────────────┘

Full State (historyLength >= 30):
┌──────────────────────────────────────────┐
│  30-Day Rank               48th percentile│
│  ━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━ │
└──────────────────────────────────────────┘
```

---

## Story 4: Enhanced Raw→Score Display (Completed 2026-02-05)

### What Was Built
- Updated signal card layout in details view
- Combined raw value + score on single line with arrow separator
- Monospace font for tabular numeric alignment

### Architecture Decisions
1. **Single template change** - All 18 signals updated via one code change
2. **Flex layout with gap** - Clean alignment without manual spacing
3. **Color hierarchy** - Primary for raw value, muted for score

### Files Changed
```
src/components/MarketCompassV6.tsx      (MODIFIED - +24 lines)
```

### Before/After
```
Before:              After:
┌──────────┐         ┌──────────┐
│   18.50  │         │ 18.50 → 70│
│  → 70 pts│         │    +0.5% │
│   +0.5%  │         └──────────┘
└──────────┘
```

### Gotchas & Tips
- **Flex baseline alignment** - Use `alignItems: 'baseline'` for text alignment
- **Gap vs margin** - `gap: spacing.sm` cleaner than individual margins
- **Remove "pts" suffix** - Cleaner look, score context is obvious

---

## Story 5: Formula Tooltip Infrastructure (Completed 2026-02-08)

### What Was Built
- **formulaExplanations.ts** (`src/utils/formulaExplanations.ts`): Comprehensive formula documentation for all 18 signals
- **FormulaExplanation interface**: name, formula, bounds, thresholds[], rationale
- **getFormulaExplanation()**: Formatted multi-line explanation with interpolated values
- **getFormula()**, **getAllSignalKeys()**: Helper accessors

### Architecture Decisions
1. **Separate data file** - Decoupled from UI; formulas as static data, not embedded in component
2. **Organized by pillar** - Direction, Breadth, Volatility, Credit, Sentiment, Global
3. **Threshold arrays** - Structured data for future grid/table rendering in UI
4. **String-based formulas** - Human-readable, not executable; transparency over precision

### Testing Approach
- **27 unit tests** covering completeness, structure, and formatting
- Tests verify: all 18 keys present, required fields, threshold arrays non-empty, rationale length
- Key test: `getFormulaExplanation()` returns formatted string for every signal

### Files Changed
```
src/utils/formulaExplanations.ts               (NEW - 386 lines)
src/utils/__tests__/formulaExplanations.test.ts (NEW - ~200 lines)
```

### Gotchas & Tips
- **TypeScript unused variables**: Use `_` prefix for destructured unused vars (`[_key, formula]`)
- **Formula key mapping**: Keys in formulaExplanations must match what UI will use to look up formulas
- **18 signals confirmed**: spyVs200MA, qqqVs200MA, iwmVs200MA, advanceDeclineRatio, percentAbove200MA, newHighsVsLows, vix, putCallRatio, vixTermStructure, yieldCurve10Y2Y, highYieldSpread, investmentGradeSpread, aaiiBulls, aaiiBears, fearGreedIndex, msciWorldVs50MA, vstoxx, globalPMI

---

## Story 6: Formula Tooltip UI (Completed 2026-02-08)

### What Was Built
- **InfoIcon**: 14px SVG info icon with opacity hover states
- **FormulaCard**: Expandable card showing formula, raw/score grid, rationale
- **signalToFormulaKey mapping**: Maps 18 signal names to formula keys
- **Accordion behavior**: Only one formula card open at a time
- **slideDown animation**: 200ms ease-out enter animation

### Architecture Decisions
1. **Name-based mapping** over adding `key` field to Signal interface — avoids touching type definitions
2. **FormulaCard as standalone component** — receives signalKey, looks up formula data itself
3. **`expandedFormula` state** — simple string|null toggle, same pattern as expandedPillar

### Files Changed
```
src/components/MarketCompassV6.tsx (MODIFIED - +240 lines)
```

### Gotchas & Tips
- **Unused prop error**: FormulaCard initially received `c` prop but used `dsColors` — remove unused props
- **Call site must match signature**: Removing prop from type requires removing from JSX call too

---

## Story 7: Pillar Agreement Summary (Completed 2026-02-08)

### What Was Built
- **pillarAgreement.ts** (`src/utils/pillarAgreement.ts`): Categorization and interpretation logic
- **categorizePillars()**: Groups 6 pillars into bullish (≥60), neutral (45-59), bearish (<45)
- **getInterpretation()**: Auto-generates summary text based on distribution
- **PillarAgreement component**: Flex layout with status dots and pillar entries
- **21 unit tests** covering all categorization and interpretation paths

### Architecture Decisions
1. **Separate utility file** for testability — follows existing pattern
2. **flexWrap layout** — responsive: columns on desktop, stacks on mobile
3. **Interpretation thresholds**: 5+ bullish = strong, 4 = leaning, else mixed

### Files Changed
```
src/utils/pillarAgreement.ts                   (NEW - 40 lines)
src/utils/__tests__/pillarAgreement.test.ts    (NEW - 185 lines)
src/components/MarketCompassV6.tsx             (MODIFIED - +90 lines)
```

### Gotchas & Tips
- **Score 48 is neutral, not bearish** — boundary is 45, not 50
- **Import conflicts**: Don't declare local functions that shadow imports

---

## Story 8: Analytics Instrumentation (Completed 2026-02-08)

### What Was Built
- **analytics.ts** (`src/utils/analytics.ts`): Privacy-respecting event tracking
- **trackEvent()**: Respects DNT, console.log in dev, forwards to Plausible/GA4 in prod
- **5 tracked events**: signal_strength_viewed, percentile_viewed, formula_tooltip_opened, pillar_expanded, pillar_agreement_viewed
- **8 unit tests** covering DNT, error handling, various property types

### Architecture Decisions
1. **Separate utility** — not coupled to any specific analytics provider
2. **DNT first** — check navigator.doNotTrack before any tracking
3. **Silent failures** — analytics should never break the app
4. **Dev console logging** — useful for debugging without analytics service

### Files Changed
```
src/utils/analytics.ts                    (NEW - 62 lines)
src/utils/__tests__/analytics.test.ts     (NEW - 87 lines)
src/components/MarketCompassV6.tsx        (MODIFIED - +25 lines)
```

### Gotchas & Tips
- **navigator not defined in Vitest** — must mock `globalThis.navigator` and `globalThis.window`
- **process.env.NODE_ENV** — use `typeof process !== 'undefined'` guard for SSR safety

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
| 6. Formula UI | Story 5 (Formula Infrastructure) | ✅ Ready - Story 5 complete |

---

## Quick Commands
```bash
npm test -- --run                    # Run all tests
npm test -- --run src/utils/__tests__/designSystem.test.ts  # Run specific test
npm run build                        # Build production
npm run dev                          # Start dev server
```
