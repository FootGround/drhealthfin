import { Pillars } from '@/types/marketCompass';
import { spacing, radius, colors as dsColors } from '@/utils/designSystem';
import { categorizePillars, getInterpretation } from '@/utils/pillarAgreement';

const pillarLabels: Record<string, string> = {
  direction: 'Direction',
  breadth: 'Breadth',
  volatility: 'Volatility',
  credit: 'Credit',
  sentiment: 'Sentiment',
  global: 'Global',
};

interface PillarAgreementProps {
  pillars: Pillars;
  c: { dim: string; border: string; muted: string; text: string };
}

const CategoryColumn = ({
  status,
  label,
  entries,
  c,
}: {
  status: 'bullish' | 'neutral' | 'bearish';
  label: string;
  entries: Array<[string, number]>;
  c: { muted: string; text: string };
}) => {
  const dotColors = {
    bullish: dsColors.signal.constructive,
    neutral: c.muted,
    bearish: dsColors.signal.strongDefense,
  };

  if (entries.length === 0) return null;
  return (
    <div style={{ flex: 1, minWidth: '120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColors[status], flexShrink: 0 }} />
        <span style={{ fontSize: '14px', fontWeight: 500, fontFamily: "'SF Mono', 'Roboto Mono', 'Consolas', monospace", color: c.text }}>{entries.length}</span>
        <span style={{ fontSize: '13px', fontWeight: 400, color: c.muted }}>{label}</span>
      </div>
      {entries.map(([key, score]) => (
        <div key={key} style={{ fontSize: '13px', color: c.muted, paddingLeft: spacing.md, marginTop: spacing.xs }}>
          {pillarLabels[key]} · {score}
        </div>
      ))}
    </div>
  );
};

export const PillarAgreement = ({ pillars, c }: PillarAgreementProps) => {
  const categories = categorizePillars(pillars);
  const interpretation = getInterpretation(categories);

  return (
    <section style={{ margin: '20px', padding: spacing.md, background: c.dim, borderRadius: radius.lg }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: c.muted, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: spacing.md }}>
        Pillar Agreement
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: spacing.lg, marginBottom: spacing.md }}>
        <CategoryColumn status="bullish" label="bullish" entries={categories.bullish} c={c} />
        <CategoryColumn status="neutral" label="neutral" entries={categories.neutral} c={c} />
        <CategoryColumn status="bearish" label="bearish" entries={categories.bearish} c={c} />
      </div>
      <div style={{ fontSize: '13px', fontWeight: 400, lineHeight: 1.5, color: c.muted, paddingTop: spacing.sm, borderTop: `1px solid ${c.border}` }}>
        {interpretation}
      </div>
    </section>
  );
};
