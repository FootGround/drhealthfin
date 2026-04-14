import { spacing, radius, colors as dsColors, formatOrdinal } from '@/utils/designSystem';

interface PercentileIndicatorProps {
  percentile: number;
  c: { dim: string; muted: string; border: string };
}

export const PercentileIndicator = ({ percentile, c }: PercentileIndicatorProps) => (
  <div
    style={{
      padding: `${spacing.sm} ${spacing.md}`,
      backgroundColor: c.dim,
      borderRadius: radius.lg,
      marginTop: spacing.md,
      maxWidth: '400px',
      margin: `${spacing.md} auto 0`,
    }}
  >
    {/* Label Row */}
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: spacing.xs,
      }}
    >
      <span
        style={{
          fontSize: '12px',
          fontWeight: 500,
          lineHeight: 1.4,
          letterSpacing: '0.02em',
          color: c.muted,
        }}
      >
        30-Day Rank
      </span>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: 1.4,
          fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace",
          fontVariantNumeric: 'tabular-nums',
          color: dsColors.accent.gold,
        }}
      >
        {formatOrdinal(percentile)} percentile
      </span>
    </div>

    {/* Percentile Bar */}
    <div
      style={{
        width: '100%',
        height: '4px',
        backgroundColor: c.border,
        borderRadius: '2px',
        position: 'relative',
      }}
    >
      {/* Marker Dot */}
      <div
        style={{
          position: 'absolute',
          left: `${percentile}%`,
          top: '-2px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: dsColors.accent.gold,
          transform: 'translateX(-50%)',
          boxShadow: `0 0 0 2px ${c.dim}`,
        }}
      />
    </div>
  </div>
);
