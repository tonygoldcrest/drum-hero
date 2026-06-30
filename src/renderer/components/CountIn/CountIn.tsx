import themedark from '../../theme';

interface CountInProps {
  count: number | undefined;
  beatMs: number | undefined;
  animated?: boolean;
}

export function CountIn({ count, beatMs, animated = true }: CountInProps) {
  if (count === undefined || count <= 0) {
    return undefined;
  }

  const duration = `${(beatMs ?? 800) / 1000}s`;
  const animation = animated
    ? `countdown-pop ${duration} ease-out reverse forwards`
    : undefined;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div key={count} className="relative flex items-center justify-center">
        <div
          className="absolute rounded-full bg-accent/80 -z-1"
          style={{
            width: '12rem',
            height: '12rem',
            animation,
            boxShadow: themedark.shadow.accentButton,
            background:
              'radial-gradient(var(--color-accent-bright), color-mix(in srgb, var(--color-accent-bright) 56%, transparent) 90%, rgba(0,0,0,0) 100%)',
          }}
        />
        <div
          className="font-ui tabular-num select-none"
          style={{
            fontSize: '8rem',
            lineHeight: 1,
            fontWeight: 700,
            color: themedark.color.text,
            animation,
          }}
        >
          {count}
        </div>
      </div>
      <style>
        {`
          @keyframes countdown-pop {
            0% { transform: scale(0.6); opacity: 0; }
            25%  { transform: scale(1); opacity: 1; }
            70%  { transform: scale(1.05); opacity: 1; }
            100%   { transform: scale(2); opacity: 0; }
          }
        `}
      </style>
    </div>
  );
}
