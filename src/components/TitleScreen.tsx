import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  Coins,
  ListMusic,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CHASSIS_THEMES } from '../data/catalog';
import { PlayerProfile, SongDefinition } from '../types/game';
import { DiscCartridge } from './DiscCartridge';
import { HexUtilityButton, OrbitOrnamentalCrest } from './OrbitVectorAssets';

interface TitleScreenProps {
  profile: PlayerProfile;
  activeSong: SongDefinition;
  onPlayPrimary: () => void;
  onEnterSongSelect: () => void;
  onOpenOrbVault: () => void;
  onOpenSettings: () => void;
  onOpenIndex: () => void;
  onToggleMusic: () => void;
  onHoverTick: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = React.memo(
  ({
    profile,
    activeSong,
    onPlayPrimary,
    onEnterSongSelect,
    onOpenOrbVault,
    onOpenSettings,
    onOpenIndex,
    onToggleMusic,
    onHoverTick,
  }) => {
    const theme = CHASSIS_THEMES[profile.theme] || CHASSIS_THEMES.emerald;
    const [pressedKey, setPressedKey] = useState<'k1' | 'k2' | null>(null);
    const [beatPhase, setBeatPhase] = useState(0);
    const [discHovered, setDiscHovered] = useState(false);

    const playSublabel = !profile.tutorialSongCompleted
      ? 'Tutorial · Moments Passing Us'
      : `${activeSong.num} · ${activeSong.title}`;

    const activeRecord = profile.songRecords[activeSong.id];
    const activeBg =
      profile.levelBgSettings[activeSong.id]?.customImageDataUrl || activeSong.bgImageUrl;
    const beatIntervalMs = Math.round(60000 / Math.max(60, activeSong.bpm));

    useEffect(() => {
      const id = window.setInterval(() => {
        setBeatPhase((prev) => (prev + 1) % 4);
      }, beatIntervalMs);
      return () => window.clearInterval(id);
    }, [beatIntervalMs]);

    useEffect(() => {
      const onDown = (e: KeyboardEvent) => {
        if (e.repeat) return;
        if (e.code === profile.trigger1Code) {
          setPressedKey('k1');
          onHoverTick();
        } else if (e.code === profile.trigger2Code) {
          setPressedKey('k2');
          onHoverTick();
        }
      };
      const onUp = (e: KeyboardEvent) => {
        if (e.code === profile.trigger1Code || e.code === profile.trigger2Code) {
          setPressedKey(null);
        }
      };
      window.addEventListener('keydown', onDown);
      window.addEventListener('keyup', onUp);
      return () => {
        window.removeEventListener('keydown', onDown);
        window.removeEventListener('keyup', onUp);
      };
    }, [onHoverTick, profile.trigger1Code, profile.trigger2Code]);

    const ribbonActions = [
      {
        id: 'play',
        label: 'PLAY',
        meta: playSublabel,
        widthClass: 'w-full',
        indentClass: 'ml-0',
        primary: true,
        Icon: Play,
        borderClass: 'bg-[var(--accent)] hover:bg-[var(--accent-bright)]',
        innerClass: 'bg-[#082118] group-hover:bg-[#0d2e22]',
        labelClass: 'text-white',
        metaClass: 'text-[var(--accent-bright)]',
        onClick: onPlayPrimary,
      },
      {
        id: 'tracks',
        label: 'TRACK SELECT',
        meta: '9 Beatmaps · NG',
        widthClass: 'w-[96%]',
        indentClass: 'sm:ml-2',
        primary: false,
        Icon: ListMusic,
        borderClass: 'bg-[#2c3547] hover:bg-[var(--accent)]',
        innerClass: 'bg-[#0a0d13] group-hover:bg-[#121824]',
        labelClass: 'text-[#f3f4f6]',
        metaClass: 'text-[var(--accent-bright)]',
        onClick: onEnterSongSelect,
      },
      {
        id: 'vault',
        label: 'ORB VAULT',
        meta: `${profile.orbs.toLocaleString()} Orbs`,
        widthClass: 'w-[92%]',
        indentClass: 'sm:ml-4',
        primary: false,
        Icon: Coins,
        borderClass: 'bg-[#5c400a] hover:bg-[#fbbf24]',
        innerClass: 'bg-[#100d06] group-hover:bg-[#1c1608]',
        labelClass: 'text-[#fde68a]',
        metaClass: 'text-[#fbbf24]',
        onClick: onOpenOrbVault,
      },
      {
        id: 'options',
        label: 'OPTIONS',
        meta: 'Keys & Audio',
        widthClass: 'w-[88%]',
        indentClass: 'sm:ml-6',
        primary: false,
        Icon: Settings,
        borderClass: 'bg-[#262e3e] hover:bg-[#d1d5db]',
        innerClass: 'bg-[#0a0d13] group-hover:bg-[#141a26]',
        labelClass: 'text-[#e5e7eb]',
        metaClass: 'text-[#9ca3af]',
        onClick: onOpenSettings,
      },
      {
        id: 'index',
        label: 'WAVE INDEX',
        meta: '15 Modes',
        widthClass: 'w-[84%]',
        indentClass: 'sm:ml-8',
        primary: false,
        Icon: BookOpen,
        borderClass: 'bg-[#222836] hover:bg-[var(--accent-bright)]',
        innerClass: 'bg-[#090b10] group-hover:bg-[#121722]',
        labelClass: 'text-[#d1d5db]',
        metaClass: 'text-[#9ca3af]',
        onClick: onOpenIndex,
      },
    ];

    return (
      <div className="relative z-10 flex h-dvh w-full flex-col justify-between overflow-hidden px-5 py-4 sm:px-10 sm:py-6">
        {/* Radial Vignette Behind Optical Disc & Menu */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at 30% 50%, rgba(${theme.bgAccentRgb}, 0.18) 0%, rgba(${theme.bgAccentRgb}, 0.04) 38%, rgba(5,6,8,0.72) 78%)`,
          }}
        />

        {/* TOP CORNER FLOATING ANCHORS */}
        <div className="relative z-20 flex w-full items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <HexUtilityButton
              active={profile.musicEnabled}
              accent="theme"
              size="md"
              onClick={onToggleMusic}
              title={profile.musicEnabled ? 'Mute Soundtrack' : 'Enable Soundtrack'}
            >
              {profile.musicEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4 text-[#6b7280]" />
              )}
            </HexUtilityButton>

            <div className="flex items-center gap-3.5 text-[11px] font-bold tabular-nums text-[#9ca3af]">
              <div>
                <span className="block text-[9px] uppercase tracking-[0.2em] text-[#6b7280]">
                  Best
                </span>
                <span className="text-xs font-black text-[#f3f4f6]">
                  {profile.bestScore.toLocaleString()}
                </span>
              </div>
              <span aria-hidden="true" className="h-5 w-px bg-[#222733]" />
              <div>
                <span className="block text-[9px] uppercase tracking-[0.2em] text-[#6b7280]">
                  Peak
                </span>
                <span className="text-xs font-black text-[var(--accent-bright)]">
                  {profile.bestStreak}x
                </span>
              </div>
              <span aria-hidden="true" className="h-5 w-px bg-[#222733]" />
              <div>
                <span className="block text-[9px] uppercase tracking-[0.2em] text-[#6b7280]">
                  Orbs
                </span>
                <span className="text-xs font-black text-[#fbbf24]">
                  {profile.orbs.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onEnterSongSelect}
            onMouseEnter={onHoverTick}
            className="group flex items-center gap-3 text-right cursor-pointer bg-transparent border-0 p-0"
          >
            <div className="tabular-nums">
              <div className="flex items-center justify-end gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.22em] text-[var(--accent-bright)]">
                <span
                  className={`h-1.5 w-1.5 rotate-45 transition-colors duration-75 ${
                    beatPhase === 0 ? 'bg-[var(--accent-bright)]' : 'bg-[#374052]'
                  }`}
                />
                <span>Disc {activeSong.num}</span>
              </div>
              <div className="font-display text-xs sm:text-sm font-black tracking-wide text-[#f3f4f6] group-hover:text-[var(--accent-bright)] transition-colors">
                {activeSong.title}
              </div>
              <div className="text-[10px] font-semibold text-[#9ca3af]">
                {activeSong.bpm} BPM · NG #{activeSong.newgroundsId}
                {activeRecord ? ` · ${activeRecord.bestRank}` : ''}
              </div>
            </div>
          </button>
        </div>

        {/* CENTERPIECE: CLEAN SPINNING OPTICAL DISC (LEFT) + ORBIT CREST & ANGLED RIBBON COMMANDS (RIGHT) */}
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14">
          {/* Clean Beat-Pulsing Optical Disc (zero overlaid text/crest clutter inside artwork) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center justify-center shrink-0"
          >
            <button
              type="button"
              onClick={onPlayPrimary}
              onMouseEnter={() => {
                setDiscHovered(true);
                onHoverTick();
              }}
              onMouseLeave={() => setDiscHovered(false)}
              aria-label="Play ORBIT"
              className="group relative flex h-[230px] w-[230px] sm:h-[300px] sm:w-[300px] lg:h-[340px] lg:w-[340px] items-center justify-center rounded-full cursor-pointer bg-transparent border-0 p-0 focus:outline-none"
            >
              {/* Outer Rotating Precision Calibration Reticle */}
              <svg
                aria-hidden="true"
                viewBox="0 0 360 360"
                className="animate-orbit-cw pointer-events-none absolute inset-0 h-full w-full"
                fill="none"
              >
                <circle cx="180" cy="180" r="174" stroke="#222733" strokeWidth="1" />
                <circle
                  cx="180"
                  cy="180"
                  r="163"
                  stroke="var(--accent)"
                  strokeOpacity={beatPhase === 0 || discHovered ? 0.95 : 0.45}
                  strokeWidth={beatPhase === 0 ? '3' : '1.75'}
                  strokeDasharray="64 116 20 116"
                />
              </svg>

              <svg
                aria-hidden="true"
                viewBox="0 0 360 360"
                className="animate-orbit-ccw pointer-events-none absolute inset-0 h-full w-full"
                fill="none"
              >
                <circle
                  cx="180"
                  cy="180"
                  r="146"
                  stroke="#374052"
                  strokeWidth="1"
                  strokeDasharray="6 8"
                />
                <path
                  d="M180 6 L180 26 M180 334 L180 354 M6 180 L26 180 M334 180 L354 180"
                  stroke="var(--accent-bright)"
                  strokeWidth="2.5"
                />
              </svg>

              {/* Pure Spinning Track Optical Platter */}
              <div
                className="relative flex items-center justify-center transition-transform duration-100"
                style={{
                  transform: discHovered
                    ? 'scale(1.04)'
                    : beatPhase === 0
                    ? 'scale(1.022)'
                    : 'scale(1)',
                }}
              >
                <DiscCartridge
                  title={activeSong.title}
                  num={activeSong.num}
                  bpm={activeSong.bpm}
                  imageUrl={activeBg}
                  size="lg"
                />

                {/* Subtle Play Glyph only when hovering the disc */}
                <div
                  className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-[#050608]/45 transition-opacity duration-150 ${
                    discHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--accent-bright)] bg-[#06130e]">
                    <Play className="h-6 w-6 translate-x-0.5 fill-[var(--accent-bright)] text-[var(--accent-bright)]" />
                  </span>
                </div>
              </div>
            </button>
          </motion.div>

          {/* RIGHT COMMAND COLUMN: ORBIT Crest Header + Clean Stepped Angled Ribbons */}
          <div className="relative z-10 flex w-full max-w-[460px] flex-col items-start">
            {/* Wordmark + Symmetrical Ornamental Crest */}
            <div className="mb-4 w-full">
              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent-bright)] tabular-nums">
                <span>Precision Rhythm Calibration</span>
                <span className="text-[#9ca3af]">1.0X Sync</span>
              </div>
              <h1 className="font-display mt-1 text-5xl sm:text-6xl font-black tracking-[0.26em] text-white leading-none">
                ORBIT
              </h1>
              <OrbitOrnamentalCrest className="mt-1.5 w-64 sm:w-72 opacity-85" />
            </div>

            {/* Stepped Angled Ribbon Stack */}
            <div className="flex w-full flex-col items-start gap-2">
              {ribbonActions.map((item, idx) => {
                const Icon = item.Icon;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.28,
                      delay: 0.04 + idx * 0.045,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{ x: 8 }}
                    whileTap={{ scale: 0.985 }}
                    onMouseEnter={onHoverTick}
                    onClick={item.onClick}
                    className={`tactile-key clip-ribbon-right group relative ${item.widthClass} ${item.indentClass} ${item.borderClass} p-[1.5px] text-left cursor-pointer transition-colors`}
                  >
                    <div
                      className={`clip-ribbon-right relative flex w-full items-center justify-between gap-4 ${item.innerClass} ${
                        item.primary ? 'py-3.5 pl-5 pr-8' : 'py-2.5 pl-5 pr-7'
                      } transition-colors`}
                    >
                      {item.primary && (
                        <span
                          aria-hidden="true"
                          className="animate-laser-scan pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-transparent via-[var(--accent-bright)]/18 to-transparent"
                        />
                      )}
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`shrink-0 ${
                            item.primary
                              ? 'h-5 w-5 fill-[var(--accent-bright)] text-[var(--accent-bright)]'
                              : `h-4 w-4 ${item.metaClass}`
                          }`}
                        />
                        <div className="min-w-0">
                          <span
                            className={`font-display block font-black tracking-[0.16em] uppercase whitespace-nowrap leading-none ${
                              item.primary ? 'text-xl sm:text-2xl' : 'text-xs sm:text-sm'
                            } ${item.labelClass}`}
                          >
                            {item.label}
                          </span>
                          {item.primary && (
                            <span className="mt-1 block truncate text-[11px] font-semibold text-[#d1d5db]">
                              {item.meta}
                            </span>
                          )}
                        </div>
                      </div>

                      {!item.primary && (
                        <span
                          className={`tabular-nums text-[11px] font-bold whitespace-nowrap shrink-0 ${item.metaClass}`}
                        >
                          {item.meta}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM SATELLITE UTILITY ROW */}
        <div className="relative z-20 flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b7280]">
            <span className="text-[var(--accent-bright)]">Click Disc or PLAY</span>
            <span aria-hidden="true">·</span>
            <span className="hidden sm:inline">Pure 1.0x Audio · Orb Cash-Out System</span>
          </div>

          <div className="flex items-center gap-2.5 tabular-nums">
            <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-[0.2em] text-[#6b7280]">
              Triggers
            </span>
            <button
              type="button"
              data-pressed={pressedKey === 'k1'}
              onMouseDown={() => {
                setPressedKey('k1');
                onHoverTick();
              }}
              onMouseUp={() => setPressedKey(null)}
              onMouseLeave={() => setPressedKey(null)}
              className="tactile-key clip-hex flex h-9 min-w-[68px] items-center justify-center bg-[#2d3648] p-[1px] data-[pressed=true]:bg-[var(--accent-bright)] cursor-pointer"
            >
              <span className="clip-hex flex h-full w-full items-center justify-center bg-[#0d1118] px-3 text-[10px] font-black text-[#f3f4f6]">
                {profile.trigger1Label}
              </span>
            </button>
            <button
              type="button"
              data-pressed={pressedKey === 'k2'}
              onMouseDown={() => {
                setPressedKey('k2');
                onHoverTick();
              }}
              onMouseUp={() => setPressedKey(null)}
              onMouseLeave={() => setPressedKey(null)}
              className="tactile-key clip-hex flex h-9 min-w-[68px] items-center justify-center bg-[#2d3648] p-[1px] data-[pressed=true]:bg-[var(--accent-bright)] cursor-pointer"
            >
              <span className="clip-hex flex h-full w-full items-center justify-center bg-[#0d1118] px-3 text-[10px] font-black text-[#f3f4f6]">
                {profile.trigger2Label}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  },
);
