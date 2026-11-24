import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Coins, ListMusic, Play, Settings } from 'lucide-react';
import { CHASSIS_THEMES } from '../data/catalog';
import { PlayerProfile, SongDefinition } from '../types/game';

interface TitleScreenProps {
  profile: PlayerProfile;
  activeSong: SongDefinition;
  onPlayPrimary: () => void;
  onEnterSongSelect: () => void;
  onOpenOrbVault: () => void;
  onOpenSettings: () => void;
  onOpenIndex: () => void;
  onHoverTick: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  profile,
  activeSong,
  onPlayPrimary,
  onEnterSongSelect,
  onOpenOrbVault,
  onOpenSettings,
  onOpenIndex,
  onHoverTick,
}) => {
  const theme = CHASSIS_THEMES[profile.theme] || CHASSIS_THEMES.emerald;
  const playSublabel = !profile.tutorialSongCompleted
    ? 'Start Calibration · Moments Passing Us'
    : `Launch · ${activeSong.title}`;

  const menuBlades = [
    {
      id: 'tracks',
      label: 'Track Select',
      meta: '9 Beatmaps',
      widthClass: 'w-full',
      Icon: ListMusic,
      accent: 'text-[var(--theme-bright)]',
      onClick: onEnterSongSelect,
    },
    {
      id: 'vault',
      label: 'Orb Vault',
      meta: `${profile.orbs.toLocaleString()} Orbs`,
      widthClass: 'w-[86%]',
      Icon: Coins,
      accent: 'text-[#fbbf24]',
      onClick: onOpenOrbVault,
    },
    {
      id: 'options',
      label: 'Options',
      meta: 'Keys & Audio',
      widthClass: 'w-[72%]',
      Icon: Settings,
      accent: 'text-[#d1d5db]',
      onClick: onOpenSettings,
    },
    {
      id: 'index',
      label: 'Wave Index',
      meta: '15 Modes',
      widthClass: 'w-[58%]',
      Icon: BookOpen,
      accent: 'text-[#9ca3af]',
      onClick: onOpenIndex,
    },
  ];

  return (
    <div className="relative z-10 flex h-dvh w-full items-center justify-center overflow-hidden px-6 sm:px-12 lg:px-20">
      {/* Volumetric Green / Theme Ambient Lighting Beams */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 26% 50%, rgba(${theme.bgAccentRgb}, 0.24) 0%, rgba(${theme.bgAccentRgb}, 0.06) 38%, transparent 68%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-1/2 h-[540px] w-[540px] -translate-y-1/2 rounded-full opacity-25"
        style={{
          background: `radial-gradient(circle, rgba(${theme.bgAccentRgb}, 0.36) 0%, transparent 70%)`,
        }}
      />

      {/* Asymmetric 2-Column Hero Layout (Zero Top/Bottom Clutter) */}
      <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] items-center gap-10 lg:gap-14">
        {/* LEFT ANCHOR: Kinetic Orbital Reticle + Brand Wordmark */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col items-center lg:items-start text-center lg:text-left"
        >
          {/* Rotating Dual-Ring Vector Visualizer */}
          <div className="relative mb-6 flex h-44 w-44 sm:h-56 sm:w-56 items-center justify-center">
            <svg
              aria-hidden="true"
              viewBox="0 0 240 240"
              className="animate-orbit-cw absolute inset-0 h-full w-full"
              fill="none"
            >
              <circle
                cx="120"
                cy="120"
                r="110"
                stroke="var(--theme-primary)"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="36 14 8 14"
              />
              <circle
                cx="120"
                cy="120"
                r="92"
                stroke="var(--theme-bright)"
                strokeOpacity="0.8"
                strokeWidth="3"
                strokeDasharray="62 190"
              />
            </svg>

            <svg
              aria-hidden="true"
              viewBox="0 0 240 240"
              className="animate-orbit-ccw absolute inset-0 h-full w-full"
              fill="none"
            >
              <circle
                cx="120"
                cy="120"
                r="72"
                stroke="#374052"
                strokeWidth="1.5"
                strokeDasharray="16 10"
              />
              <path
                d="M120 18 L120 34 M120 206 L120 222 M18 120 L34 120 M206 120 L222 120"
                stroke="var(--theme-bright)"
                strokeWidth="2"
              />
            </svg>

            {/* Inner Emblem Core */}
            <div className="clip-chamfer-md flex h-24 w-24 items-center justify-center border border-[var(--theme-primary)]/50 bg-[#0b0f15]/90">
              <div className="flex flex-col items-center">
                <span className="h-3.5 w-3.5 rotate-45 bg-[var(--theme-bright)]" />
                <span className="mt-2 tabular-nums text-[10px] font-black tracking-[0.26em] text-[#9ca3af]">
                  1.0X
                </span>
              </div>
            </div>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black tracking-[0.22em] text-[#f3f4f6] leading-none">
            ORBIT
          </h1>
          <div className="mt-3 h-1 w-28 bg-[var(--theme-primary)]" />
          <p className="mt-4 max-w-md text-sm sm:text-base font-medium leading-relaxed text-[#d1d5db]">
            Precision circular rhythm calibrated to pure 1.0x Newgrounds soundtracks, 15 orbital wave modes, and Orb Cash-Out mastery.
          </p>
        </motion.div>

        {/* RIGHT ANCHOR: Side Rectangular PLAY Monolith + Inverted-Triangle Tapered Stack */}
        <div className="flex w-full max-w-[460px] flex-col items-end gap-3 justify-self-center lg:justify-self-end">
          {/* Primary Side PLAY Monolith */}
          <motion.button
            type="button"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ x: -8, scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            onMouseEnter={onHoverTick}
            onClick={onPlayPrimary}
            className="clip-monolith group relative flex min-h-[124px] w-full items-center justify-between overflow-hidden bg-[var(--theme-primary)] p-[2px] text-left cursor-pointer"
          >
            <div className="clip-monolith relative flex h-full w-full items-center justify-between gap-4 bg-gradient-to-r from-[#071f17] via-[#0c2e22] to-[#0a1a14] px-6 py-5 transition-colors group-hover:from-[#0a2b20] group-hover:via-[#114231]">
              {/* Animated Laser Scan Beam */}
              <span
                aria-hidden="true"
                className="animate-laser-scan pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-transparent via-[var(--theme-bright)]/20 to-transparent"
              />

              {/* Left Accent Wedge */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-6 bottom-6 w-1.5 bg-[var(--theme-bright)]"
              />

              <div className="relative z-10 min-w-0 pl-2">
                <span className="block tabular-nums text-[11px] font-extrabold tracking-[0.22em] uppercase text-[var(--theme-bright)]">
                  {!profile.tutorialSongCompleted ? 'First Calibration' : 'Active Beatmap'}
                </span>
                <span className="font-display mt-0.5 block text-3xl sm:text-4xl font-black tracking-[0.16em] text-white leading-none">
                  PLAY
                </span>
                <span className="mt-1.5 block truncate text-xs font-semibold text-[#d1d5db]">
                  {playSublabel}
                </span>
              </div>

              <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[var(--theme-bright)] bg-[var(--theme-primary)]/20 transition-transform duration-150 group-hover:scale-110">
                <Play className="h-7 w-7 translate-x-0.5 fill-[var(--theme-bright)] text-[var(--theme-bright)]" />
              </div>
            </div>
          </motion.button>

          {/* Tapered Inverted-Triangle Menu Stack (Widest Top -> Smallest Bottom) */}
          <div className="flex w-full flex-col items-end gap-2.5 pt-1">
            {menuBlades.map((blade, idx) => {
              const Icon = blade.Icon;
              return (
                <motion.button
                  key={blade.id}
                  type="button"
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.34,
                    delay: 0.08 + idx * 0.055,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={{ x: -10 }}
                  whileTap={{ scale: 0.98 }}
                  onMouseEnter={onHoverTick}
                  onClick={blade.onClick}
                  className={`clip-blade-right group relative ${blade.widthClass} bg-[#2b3446] p-[1.5px] transition-colors hover:bg-[var(--theme-primary)] cursor-pointer`}
                >
                  <div className="clip-blade-right relative flex items-center justify-between gap-3 bg-[#0c1017]/95 px-5 py-3 transition-colors group-hover:bg-[#111923]">
                    {/* Glowing Left Accent Bar on Hover */}
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--theme-bright)] opacity-0 transition-opacity group-hover:opacity-100"
                    />

                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${blade.accent}`} />
                      <span className="font-display text-xs sm:text-sm font-black tracking-[0.14em] uppercase text-[#f3f4f6] whitespace-nowrap">
                        {blade.label}
                      </span>
                    </div>

                    <span className="tabular-nums text-[11px] font-bold text-[#9ca3af] group-hover:text-white whitespace-nowrap shrink-0">
                      {blade.meta}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
