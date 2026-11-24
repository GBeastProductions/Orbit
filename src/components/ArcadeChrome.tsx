import React from 'react';
import { motion } from 'motion/react';

interface ArcadeFrameProps {
  children: React.ReactNode;
  className?: string;
  accent?: 'theme' | 'gold' | 'crimson';
  size?: 'md' | 'lg';
}

/**
 * Kenney Sci-Fi / Retro Arcade vector container with chamfered 45° corners
 * and crisp SVG laser corner reticles.
 */
export const ArcadeFrame: React.FC<ArcadeFrameProps> = ({
  children,
  className = '',
  accent = 'theme',
  size = 'lg',
}) => {
  const strokeColor =
    accent === 'gold' ? '#fbbf24' : accent === 'crimson' ? '#ef4444' : 'var(--theme-bright)';
  const clipClass = size === 'lg' ? 'clip-chamfer-lg' : 'clip-chamfer-md';

  return (
    <div className={`relative ${className}`}>
      {/* Outer Rim Glow Shell */}
      <div
        className={`${clipClass} relative h-full w-full bg-[#2b3344] p-[1.5px]`}
      >
        <div className={`${clipClass} relative h-full w-full bg-[#0b0e14]/96`}>
          {children}
        </div>
      </div>

      {/* Top-Left & Bottom-Right Vector Corner Brackets */}
      <svg
        aria-hidden="true"
        viewBox="0 0 28 28"
        className="pointer-events-none absolute -top-[1px] -left-[1px] h-7 w-7"
        fill="none"
      >
        <path
          d="M1 26 L1 18 L18 1 L26 1"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="square"
        />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 28 28"
        className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-7 w-7"
        fill="none"
      >
        <path
          d="M27 2 L27 10 L10 27 L2 27"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="square"
        />
      </svg>
    </div>
  );
};

interface ArcadeSwitchProps {
  checked: boolean;
  onToggle: () => void;
  labelOn?: string;
  labelOff?: string;
}

export const ArcadeSwitch: React.FC<ArcadeSwitchProps> = ({
  checked,
  onToggle,
  labelOn = 'ON',
  labelOff = 'OFF',
}) => {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onToggle}
      aria-pressed={checked}
      className={`clip-chamfer-sm relative flex min-w-[72px] items-center justify-between gap-2 px-3 py-1.5 text-xs font-black tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
        checked
          ? 'bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
          : 'bg-[#1a202c] text-[#9ca3af] hover:text-white'
      }`}
    >
      <span>{checked ? labelOn : labelOff}</span>
      <span
        aria-hidden="true"
        className={`h-2 w-2 rotate-45 ${
          checked ? 'bg-[var(--theme-on-primary)]' : 'bg-[#4b5563]'
        }`}
      />
    </motion.button>
  );
};

interface ZoomWarpTransitionProps {
  active: boolean;
  label: string;
}

/**
 * Full-screen orbital zoom-fade transition overlay when launching from Menu / Song Select into a level.
 */
export const ZoomWarpTransition: React.FC<ZoomWarpTransitionProps> = ({ active, label }) => {
  if (!active) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.48, times: [0, 0.25, 0.72, 1], ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-[#050608]/85"
    >
      {/* Expanding Concentric Orbital Reticles */}
      <motion.div
        initial={{ scale: 0.35, opacity: 0.2, rotate: -35 }}
        animate={{ scale: 2.35, opacity: [0.2, 1, 0], rotate: 45 }}
        transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex h-64 w-64 items-center justify-center"
      >
        <svg viewBox="0 0 200 200" className="h-full w-full" fill="none">
          <circle
            cx="100"
            cy="100"
            r="88"
            stroke="var(--theme-bright)"
            strokeWidth="2.5"
            strokeDasharray="28 12"
          />
          <circle
            cx="100"
            cy="100"
            r="64"
            stroke="var(--theme-primary)"
            strokeWidth="1.5"
          />
          <path d="M100 4 L100 22 M100 178 L100 196 M4 100 L22 100 M178 100 L196 100" stroke="#ffffff" strokeWidth="2.5" />
        </svg>
      </motion.div>

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1.15, opacity: [0, 1, 0] }}
        transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
        className="absolute text-center"
      >
        <span className="font-display text-sm font-black tracking-[0.34em] uppercase text-[var(--theme-bright)]">
          {label}
        </span>
      </motion.div>
    </motion.div>
  );
};
