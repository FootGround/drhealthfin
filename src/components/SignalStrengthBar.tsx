export const SignalStrengthBar = ({ level, color, borderColor }: { level: 1 | 2 | 3; color: string; borderColor: string }) => (
  <div
    style={{
      display: 'flex',
      gap: '3px',
      alignItems: 'flex-end',
    }}
    role="img"
    aria-hidden="true"
  >
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        style={{
          width: '4px',
          height: i <= level ? '12px' : '8px',
          borderRadius: '2px',
          backgroundColor: i <= level ? color : borderColor,
          transition: 'all 0.2s ease',
        }}
      />
    ))}
  </div>
);
