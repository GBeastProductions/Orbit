import React from 'react';

interface OrbitOrnamentalCrestProps {
  className?: string;
  accentColor?: string;
}

/**
 * Symmetrical orbital calibration filigree crest (inspired by Hollow Knight's ornamental crests,
 * reimagined in precision vector instrumentation geometry for ORBIT).
 */
export const OrbitOrnamentalCrest: React.FC<OrbitOrnamentalCrestProps> = ({
  className = '',
  accentColor = 'var(--accent-bright)',
}) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 36"
      className={`pointer-events-none select-none ${className}`}
      fill="none"
    >
      {/* Center Precision Diamond & Orbital Ring */}
      <circle cx="180" cy="18" r="10" stroke={accentColor} strokeWidth="1.5" />
      <circle cx="180" cy="18" r="4" fill={accentColor} />
      <path d="M180 2 L180 7 M180 29 L180 34" stroke="#f3f4f6" strokeWidth="1.4" />

      {/* Left Wing Filigree Sweep */}
      <path
        d="M164 18 C144 18 138 7 120 7 C104 7 98 18 74 18 L18 18"
        stroke="#d1d5db"
        strokeWidth="1.25"
      />
      <path
        d="M164 18 C144 18 138 29 120 29 C104 29 98 18 74 18"
        stroke={accentColor}
        strokeOpacity="0.65"
        strokeWidth="1.1"
      />
      <path d="M18 18 L10 13 L4 18 L10 23 Z" stroke={accentColor} strokeWidth="1.2" />
      <circle cx="120" cy="18" r="2.2" fill="#f3f4f6" />

      {/* Right Wing Filigree Sweep */}
      <path
        d="M196 18 C216 18 222 7 240 7 C256 7 262 18 286 18 L342 18"
        stroke="#d1d5db"
        strokeWidth="1.25"
      />
      <path
        d="M196 18 C216 18 222 29 240 29 C256 29 262 18 286 18"
        stroke={accentColor}
        strokeOpacity="0.65"
        strokeWidth="1.1"
      />
      <path d="M342 18 L350 13 L356 18 L350 23 Z" stroke={accentColor} strokeWidth="1.2" />
      <circle cx="240" cy="18" r="2.2" fill="#f3f4f6" />
    </svg>
  );
};

interface HexUtilityButtonProps {
  onClick?: () => void;
  title?: string;
  ariaLabel?: string;
  active?: boolean;
  accent?: 'theme' | 'gold' | 'crimson' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  pressed?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Tactile Hexagonal Hardware Switch (inspired by Sci-Fi radial HUD utility hexagons).
 */
export const HexUtilityButton: React.FC<HexUtilityButtonProps> = ({
  onClick,
  title,
  ariaLabel,
  active = false,
  accent = 'neutral',
  size = 'md',
  pressed = false,
  className = '',
  children,
}) => {
  const dims =
    size === 'lg' ? 'h-12 w-14' : size === 'sm' ? 'h-8 w-9' : 'h-10 w-11';

  const outerFill =
    active && accent === 'theme'
      ? 'var(--accent)'
      : active && accent === 'gold'
      ? '#fbbf24'
      : accent === 'gold'
      ? '#6b4c0d'
      : accent === 'crimson'
      ? '#7f1d1d'
      : '#2d3648';

  const innerFill =
    active && accent === 'theme'
      ? '#09241b'
      : active && accent === 'gold'
      ? '#2b1e05'
      : '#0b0e14';

  const textColor =
    active && accent === 'theme'
      ? 'text-[var(--accent-bright)]'
      : accent === 'gold'
      ? 'text-[#fbbf24]'
      : accent === 'crimson'
      ? 'text-[#fca5a5]'
      : 'text-[#e5e7eb]';

  const content = (
    <div
      className={`tactile-key relative flex items-center justify-center ${dims} ${textColor} ${className}`}
      data-pressed={pressed ? 'true' : undefined}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 88"
        className="pointer-events-none absolute inset-0 h-full w-full"
        fill="none"
      >
        <polygon
          points="25,2 75,2 98,44 75,86 25,86 2,44"
          fill={innerFill}
          stroke={outerFill}
          strokeWidth="4"
        />
        <polygon
          points="29,9 71,9 90,44 71,79 29,79 10,44"
          stroke={active ? outerFill : '#1c2230'}
          strokeWidth="1.5"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center leading-none">
        {children}
      </div>
    </div>
  );

  if (!onClick) {
    return (
      <div title={title} aria-label={ariaLabel}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      className="cursor-pointer bg-transparent p-0 border-0 focus:outline-none group hover:brightness-115"
    >
      {content}
    </button>
  );
};

interface RadialHudGaugeProps {
  valueText: string;
  label: string;
  sublabel?: string;
  progress: number; // 0..1
  color?: string;
  size?: number;
  className?: string;
}

/**
 * Radial Tachometer / Telemetry Arc Gauge (inspired by Paragon & Sci-Fi HUD radial dials).
 */
export const RadialHudGauge: React.FC<RadialHudGaugeProps> = ({
  valueText,
  label,
  sublabel,
  progress,
  color = 'var(--accent-bright)',
  size = 112,
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const r = 42;
  const cx = 54;
  const cy = 54;
  // 250-degree sweep starting at 145 deg (bottom-left) to 395 deg (bottom-right)
  const startDeg = 145;
  const totalSweep = 250;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * (totalSweep / 360);
  const activeLen = arcLen * clamped;

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 108 108"
        className="absolute inset-0 h-full w-full"
        fill="none"
      >
        {/* Outer Instrumentation Housing */}
        <circle cx={cx} cy={cy} r="51" stroke="#1d2432" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="33" fill="#07090e" stroke="#222938" strokeWidth="1" />

        {/* Track Arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#181f2c"
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={`${arcLen} ${circ}`}
          transform={`rotate(${startDeg} ${cx} ${cy})`}
        />

        {/* Active Fill Arc */}
        {clamped > 0.005 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={color}
            strokeWidth="6"
            strokeLinecap="butt"
            strokeDasharray={`${activeLen} ${circ}`}
            transform={`rotate(${startDeg} ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 140ms ease-out' }}
          />
        )}

        {/* 10 Calibration Tick Marks */}
        {Array.from({ length: 11 }).map((_, idx) => {
          const deg = startDeg + (totalSweep * idx) / 10;
          const rad = (deg * Math.PI) / 180;
          const x1 = cx + Math.cos(rad) * 47;
          const y1 = cy + Math.sin(rad) * 47;
          const x2 = cx + Math.cos(rad) * 51;
          const y2 = cy + Math.sin(rad) * 51;
          return (
            <line
              key={idx}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={idx / 10 <= clamped ? color : '#374052'}
              strokeWidth={idx % 5 === 0 ? '1.6' : '1'}
            />
          );
        })}
      </svg>

      <div className="relative z-10 flex flex-col items-center justify-center text-center tabular-nums">
        <span className="font-display text-lg sm:text-xl font-black leading-none text-[#f3f4f6]">
          {valueText}
        </span>
        <span className="mt-1 text-[8px] font-extrabold tracking-[0.18em] uppercase text-[#9ca3af]">
          {label}
        </span>
        {sublabel && (
          <span
            className="mt-0.5 text-[8px] font-bold tracking-wider uppercase"
            style={{ color }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};

interface TopNotchBridgeProps {
  songHudTitle: string;
  songTimerText: string;
  songProgressPct: number;
  leftBadge?: React.ReactNode;
}

/**
 * Segmented Top-Center Trapezoid Telemetry Notch (inspired by Paragon's top timer notch).
 */
export const TopNotchBridge: React.FC<TopNotchBridgeProps> = ({
  songHudTitle,
  songTimerText,
  songProgressPct,
  leftBadge,
}) => {
  return (
    <div className="relative z-20 flex w-full justify-center pointer-events-none">
      <div className="clip-notch-top pointer-events-auto relative flex items-center gap-3 sm:gap-5 border-b border-x border-[#2b3446] bg-[#080b11]/96 px-7 sm:px-10 py-1.5">
        {leftBadge}
        <span className="max-w-[200px] sm:max-w-[340px] truncate text-[10px] sm:text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#e5e7eb] tabular-nums">
          {songHudTitle}
        </span>
        <span aria-hidden="true" className="h-3 w-px bg-[#263042]" />
        <span className="shrink-0 text-[11px] font-black tracking-[0.12em] uppercase text-[var(--accent-bright)] tabular-nums">
          {songTimerText}
        </span>

        {/* Thin bottom progress trace inside the notch */}
        <div className="absolute bottom-0 left-5 right-5 h-[2px] bg-[#18202d] overflow-hidden">
          <div
            className="h-full bg-[var(--accent-bright)] transition-[width] duration-150"
            style={{ width: `${Math.max(0, Math.min(100, songProgressPct))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
