import { Pillars } from '@/types/marketCompass';

interface RadarChartProps {
  pillars: Pillars;
  c: { border: string; muted: string; text: string; positive: string; negative: string };
}

const items: Array<{ key: keyof Pillars; label: string }> = [
  { key: 'direction', label: 'Direction' },
  { key: 'breadth', label: 'Breadth' },
  { key: 'volatility', label: 'Volatility' },
  { key: 'credit', label: 'Credit' },
  { key: 'sentiment', label: 'Sentiment' },
  { key: 'global', label: 'Global' },
];

export const RadarChart = ({ pillars, c }: RadarChartProps) => {
  const cx = 150, cy = 130, maxR = 75;
  const labelR = maxR + 18;
  const angles = items.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / 6);

  const pt = (r: number, i: number) => ({
    x: cx + r * Math.cos(angles[i]),
    y: cy + r * Math.sin(angles[i]),
  });

  const getColor = (score: number) =>
    score >= 60 ? c.positive : score >= 45 ? '#eab308' : c.negative;

  const dataPolygon = items
    .map(({ key }, i) => { const p = pt((pillars[key].score / 100) * maxR, i); return `${p.x},${p.y}`; })
    .join(' ');

  const gridPolygon = (pct: number) =>
    items.map((_, i) => { const p = pt(pct * maxR, i); return `${p.x},${p.y}`; }).join(' ');

  return (
    <svg
      viewBox="0 0 300 260"
      style={{ width: '100%', maxWidth: '320px', height: 'auto', display: 'block', margin: '0 auto' }}
      aria-label="Pillar scores radar chart"
    >
      {[0.25, 0.5, 0.75, 1].map((pct, i) => (
        <polygon key={i} points={gridPolygon(pct)} fill="none" stroke={c.border} strokeWidth="1" />
      ))}
      {items.map((_, i) => {
        const end = pt(maxR, i);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={c.border} strokeWidth="1" />;
      })}
      <polygon points={dataPolygon} fill="#22c55e18" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round" />
      {items.map(({ key }, i) => {
        const p = pt((pillars[key].score / 100) * maxR, i);
        return <circle key={i} cx={p.x} cy={p.y} r="3" fill={getColor(pillars[key].score)} />;
      })}
      {items.map(({ key, label }, i) => {
        const angle = angles[i];
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);
        const score = pillars[key].score;
        const anchor: 'start' | 'end' | 'middle' =
          Math.cos(angle) > 0.3 ? 'start' : Math.cos(angle) < -0.3 ? 'end' : 'middle';
        return (
          <g key={i}>
            <text x={lx} y={ly - 5} textAnchor={anchor} fontSize="9" fill={c.muted}>{label}</text>
            <text x={lx} y={ly + 7} textAnchor={anchor} fontSize="12" fontWeight="600" fill={getColor(score)}>{score}</text>
          </g>
        );
      })}
    </svg>
  );
};
