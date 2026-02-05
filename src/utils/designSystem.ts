// ============================================================================
// DESIGN SYSTEM - Market Compass Transparency Features
// Based on PRD_Transparency_v3.md specifications
// ============================================================================

export const colors = {
  // Backgrounds (Dark Mode Primary)
  bg: {
    primary: '#0A0A0B',      // Near-black, not pure black
    secondary: '#111113',    // Cards, elevated surfaces
    tertiary: '#18181B',     // Hover states, subtle fills
  },

  // Borders
  border: {
    subtle: '#27272A',       // Dividers, card borders
    medium: '#3F3F46',       // Interactive borders
  },

  // Text
  text: {
    primary: '#FAFAFA',      // Headlines, primary content
    secondary: '#A1A1AA',    // Body text, descriptions
    tertiary: '#71717A',     // Labels, captions, muted
  },

  // Semantic (Signal Strength)
  signal: {
    strongDefense: '#EF4444',  // Red 500 - not too bright
    defense: '#F97316',         // Orange 500
    neutral: '#71717A',         // Zinc 500 - true neutral
    constructive: '#22C55E',    // Green 500
    strongOffense: '#10B981',   // Emerald 500 - distinct from constructive
  },

  // Accents
  accent: {
    primary: '#3B82F6',      // Blue 500 - interactive elements
    gold: '#EAB308',         // Yellow 500 - percentile/rank
  },
};

export const typography = {
  // Display - Hero score only
  display: {
    fontSize: '72px',
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  // Headline - Section titles
  headline: {
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.01em',
    textTransform: 'uppercase' as const,
  },

  // Title - Pillar names, signal names
  title: {
    fontSize: '15px',
    fontWeight: 500,
    lineHeight: 1.4,
  },

  // Body - Primary content
  body: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: 1.5,
  },

  // Caption - Secondary info, descriptions
  caption: {
    fontSize: '13px',
    fontWeight: 400,
    lineHeight: 1.5,
  },

  // Label - Smallest text (tags, badges)
  label: {
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.02em',
  },

  // Mono - Numbers, formulas, data
  mono: {
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1.4,
    fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace",
    fontVariantNumeric: 'tabular-nums' as const,
  },
};

export const spacing = {
  xs: '4px',    // Tight groupings only
  sm: '8px',    // Default gap
  md: '16px',   // Section padding
  lg: '24px',   // Major sections
  xl: '32px',   // Page-level
  xxl: '48px',  // Hero areas
};

export const radius = {
  sm: '4px',    // Small elements, badges
  md: '6px',    // Buttons, inputs
  lg: '8px',    // Cards, panels
};

// ============================================================================
// SIGNAL STRENGTH - Actionability indicator
// ============================================================================

export interface SignalStrength {
  level: 1 | 2 | 3;
  label: string;
  color: string;
  description: string;
  frequency: string;
}

/**
 * Determine signal strength from composite score
 * Used to communicate actionability to users
 */
export const getSignalStrength = (score: number): SignalStrength => {
  if (score <= 30) {
    return {
      level: 3,
      label: 'Strong Defensive',
      color: colors.signal.strongDefense,
      description: 'Extreme fear — historically near bottoms',
      frequency: '~8% of days',
    };
  }
  if (score <= 40) {
    return {
      level: 2,
      label: 'Defensive',
      color: colors.signal.defense,
      description: 'Elevated caution warranted',
      frequency: '~18% of days',
    };
  }
  if (score <= 60) {
    return {
      level: 1,
      label: 'Neutral',
      color: colors.signal.neutral,
      description: 'No directional bias',
      frequency: '~50% of days',
    };
  }
  if (score <= 70) {
    return {
      level: 2,
      label: 'Constructive',
      color: colors.signal.constructive,
      description: 'Favorable for risk assets',
      frequency: '~18% of days',
    };
  }
  return {
    level: 3,
    label: 'Strong Offensive',
    color: colors.signal.strongOffense,
    description: 'Extreme optimism — watch for reversal',
    frequency: '~6% of days',
  };
};
