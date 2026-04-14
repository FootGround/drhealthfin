import { spacing, radius, colors as dsColors } from '@/utils/designSystem';
import { formulaExplanations } from '@/utils/formulaExplanations';

interface FormulaCardProps {
  signalKey: string;
  rawValue: string | number | boolean;
  score: number;
  c: { dim: string; bg: string; muted: string; text: string; border: string };
  subValues?: { label: string; value: string }[];
}

export const FormulaCard = ({ signalKey, rawValue, score, c, subValues }: FormulaCardProps) => {
  const formula = formulaExplanations[signalKey];
  if (!formula) return null;

  const displayRaw =
    typeof rawValue === 'boolean' ? (rawValue ? 'Contango' : 'Backwardation') : rawValue;

  const activeThreshold = formula.thresholds.find(t => t.scoreRange === score.toString());

  return (
    <div
      style={{
        padding: spacing.md,
        backgroundColor: c.dim,
        borderRadius: radius.lg,
        border: `1px solid ${c.border}`,
        marginTop: spacing.sm,
      }}
    >
      {/* Section Label */}
      <div style={{ fontSize: '12px', fontWeight: 500, lineHeight: 1.4, letterSpacing: '0.02em', color: c.muted, marginBottom: spacing.sm }}>
        FORMULA
      </div>

      {/* Formula Code Block */}
      <div
        style={{
          fontSize: '13px', fontWeight: 500, lineHeight: 1.4,
          fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace",
          color: c.muted, padding: spacing.sm, backgroundColor: c.bg,
          borderRadius: radius.md, marginBottom: spacing.sm,
        }}
      >
        {formula.formula}
      </div>

      {/* Input Values */}
      {subValues && subValues.length > 0 && (
        <div
          style={{
            display: 'grid', gridTemplateColumns: `repeat(${subValues.length}, 1fr)`,
            gap: spacing.sm, padding: spacing.sm, backgroundColor: c.bg,
            borderRadius: radius.sm, marginBottom: spacing.sm,
          }}
        >
          {subValues.map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em', color: c.muted, marginBottom: '2px', textTransform: 'uppercase' as const }}>{label}</div>
              <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace", color: c.text }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Score Table */}
      <div style={{ marginBottom: spacing.sm }}>
        <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em', color: c.muted, marginBottom: spacing.xs, textTransform: 'uppercase' as const }}>
          Score Table
        </div>
        <div style={{ borderRadius: radius.sm, overflow: 'hidden', border: `1px solid ${c.border}` }}>
          {formula.thresholds.map((t, i) => {
            const isActive = (() => {
              if (t.scoreRange === score.toString()) return true;
              if (t.scoreRange.includes('-')) {
                const [lo, hi] = t.scoreRange.split('-').map(Number);
                return score >= lo && score <= hi;
              }
              return false;
            })();
            return (
              <div
                key={i}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: spacing.sm,
                  padding: `5px ${spacing.sm}`,
                  backgroundColor: isActive ? c.border : (i % 2 === 0 ? c.bg : 'transparent'),
                  borderLeft: isActive ? `2px solid ${dsColors.accent.primary}` : '2px solid transparent',
                }}
              >
                <span style={{ fontSize: '12px', fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace", color: isActive ? c.text : c.muted, fontWeight: isActive ? 600 : 400 }}>{t.range}</span>
                <span style={{ fontSize: '12px', color: isActive ? c.text : c.muted, fontWeight: isActive ? 500 : 400, textAlign: 'left' as const }}>{t.label}</span>
                <span style={{ fontSize: '12px', fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace", color: isActive ? c.text : c.muted, fontWeight: isActive ? 600 : 400, textAlign: 'right' as const }}>{t.scoreRange}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Value → Band → Score */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: spacing.sm, padding: spacing.sm,
          backgroundColor: c.bg, borderRadius: radius.sm, marginBottom: spacing.md,
          fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace", fontSize: '13px',
          flexWrap: 'wrap' as const,
        }}
      >
        <span style={{ color: c.text, fontWeight: 500 }}>{displayRaw}</span>
        <span style={{ color: c.muted }}>→</span>
        <span style={{ color: c.muted }}>{activeThreshold ? `${activeThreshold.range} (${activeThreshold.label})` : 'see table'}</span>
        <span style={{ color: c.muted }}>→</span>
        <span style={{ color: c.text, fontWeight: 600 }}>Score: {score}</span>
      </div>

      {/* Raw / Score Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.sm, marginBottom: spacing.md }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.02em', color: c.muted }}>Raw</div>
          <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace", color: c.text }}>{displayRaw}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.02em', color: c.muted }}>Score</div>
          <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace", color: c.text }}>{score}</div>
        </div>
      </div>

      {/* Rationale */}
      <div style={{ fontSize: '13px', fontWeight: 400, lineHeight: 1.5, color: c.muted, paddingTop: spacing.sm, borderTop: `1px solid ${c.border}` }}>
        {formula.rationale}
      </div>
    </div>
  );
};
