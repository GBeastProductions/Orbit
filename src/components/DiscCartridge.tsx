import React from 'react';
import { Lock } from 'lucide-react';

interface DiscCartridgeProps {
  title: string;
  num: string;
  bpm: number;
  imageUrl?: string;
  locked?: boolean;
  spinning?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Signature Mechanical Optical Cartridge Disc:
 * Represents each beatmap as a machined precision optical platter spinning cleanly at BPM ratio.
 */
export const DiscCartridge: React.FC<DiscCartridgeProps> = ({
  title,
  num,
  bpm,
  imageUrl,
  locked = false,
  spinning = true,
  size = 'md',
}) => {
  const spinSec = Math.max(4.5, Math.min(18, 960 / Math.max(60, bpm)));
  const sizeClass =
    size === 'lg'
      ? 'h-48 w-48 sm:h-56 sm:w-56'
      : size === 'sm'
      ? 'h-16 w-16'
      : 'h-28 w-28';

  return (
    <div
      className={`relative shrink-0 select-none ${sizeClass}`}
      aria-label={`Optical Cartridge ${num} ${title}`}
    >
      {/* Rotating Outer Optical Platter */}
      <div
        className="relative h-full w-full rounded-full border border-[#2d3648] bg-[#080a0f]"
        style={
          spinning
            ? {
                animation: `slowOrbitSpin ${spinSec.toFixed(2)}s linear infinite`,
              }
            : undefined
        }
      >
        {/* Concentric Vector Grooves */}
        <svg
          aria-hidden="true"
          viewBox="0 0 120 120"
          className="pointer-events-none absolute inset-0 h-full w-full"
          fill="none"
        >
          <circle cx="60" cy="60" r="56" stroke="#222733" strokeWidth="1" />
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="var(--accent)"
            strokeOpacity="0.45"
            strokeWidth="1"
            strokeDasharray="18 8 4 8"
          />
          <circle cx="60" cy="60" r="43" stroke="#1b2230" strokeWidth="1" />
          {/* 4 Alignment Notches */}
          <path
            d="M60 2 L60 9 M60 111 L60 118 M2 60 L9 60 M111 60 L118 60"
            stroke="var(--accent-bright)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Inner Artwork Window */}
        <div className="absolute inset-[18%] overflow-hidden rounded-full border border-[#374052] bg-[#050608]">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className={`h-full w-full object-cover ${locked ? 'grayscale opacity-40' : ''}`}
            />
          )}
          {locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Lock className="h-4 w-4 text-[#fbbf24]" />
            </div>
          )}
        </div>
      </div>

      {/* Stationary Center Machined Spindle Hub */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#374052] bg-[#0b0e14]">
        <span className="tabular-nums text-[8px] font-black tracking-widest text-[var(--accent-bright)]">
          {num}
        </span>
      </div>
    </div>
  );
};
