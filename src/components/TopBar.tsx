import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Coins, Lock, Pause, SlidersHorizontal } from 'lucide-react';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../data/catalog';
import { DifficultyId, SongDefinition } from '../types/game';
import { HexUtilityButton } from './OrbitVectorAssets';

interface TopBarProps {
  activeSong: SongDefinition;
  activeDifficulty: DifficultyId;
  unlockedDiffs: DifficultyId[];
  devUnlocked: boolean;
  equippedModsCount: number;
  orbs: number;
  beatLedIndex: number;
  songTimerText: string;
  songProgressPct: number;
  onBackToSongSelect: () => void;
  onSelectDifficulty: (diffId: DifficultyId) => void;
  onOpenOrbVault: () => void;
  onOpenMods: () => void;
  onOpenPause: () => void;
}

export const TopBar: React.FC<TopBarProps> = React.memo(
  ({
    activeSong,
    activeDifficulty,
    unlockedDiffs,
    devUnlocked,
    equippedModsCount,
    orbs,
    beatLedIndex,
    songTimerText,
    songProgressPct,
    onBackToSongSelect,
    onSelectDifficulty,
    onOpenOrbVault,
    onOpenMods,
    onOpenPause,
  }) => {
    const [diffOpen, setDiffOpen] = useState(false);
    const popRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleOutside = (e: MouseEvent) => {
        if (popRef.current && !popRef.current.contains(e.target as Node)) {
          setDiffOpen(false);
        }
      };
      document.addEventListener('click', handleOutside);
      return () => document.removeEventListener('click', handleOutside);
    }, []);

    const currentDiff = DIFFICULTIES[activeDifficulty] || DIFFICULTIES.CHILL;

    return (
      <header className="relative z-20 flex h-[52px] items-center justify-between gap-2 border-b border-[#1c2331] bg-[#07090d]/95 px-3 sm:px-5">
        {/* Zone 1: Back to Song Select + Brand + BPM LEDs */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <button
            type="button"
            onClick={onBackToSongSelect}
            className="tactile-key clip-ribbon-right flex items-center gap-1.5 border border-[#2d3648] bg-[#141820] pl-2.5 pr-4 py-1.5 text-xs font-bold text-[#f3f4f6] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-on)] cursor-pointer whitespace-nowrap shrink-0"
            title="Back to Beatmap Select"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Songs</span>
          </button>

          <span className="hidden sm:inline font-display text-sm font-black tracking-[0.2em] text-[#f3f4f6] whitespace-nowrap shrink-0">
            ORBIT
          </span>

          <div className="hidden lg:flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((idx) => (
              <span
                key={idx}
                className={`h-1.5 w-1.5 rotate-45 transition-colors duration-75 ${
                  beatLedIndex === idx ? 'bg-[var(--accent-bright)]' : 'bg-[#1b2230]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Zone 2: Unified Center Trapezoid Telemetry Notch (replaces redundant second top bar) */}
        <div className="clip-notch-top relative hidden md:flex h-full min-w-[290px] max-w-[460px] flex-1 items-center justify-center gap-3 border-x border-[#263042] bg-[#0b0f17] px-7">
          <button
            type="button"
            onClick={onBackToSongSelect}
            className="truncate text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#e5e7eb] hover:text-[var(--accent-bright)] transition-colors cursor-pointer"
            title="Switch Beatmap Track"
          >
            {activeSong.num} · {activeSong.title}
          </button>
          <span aria-hidden="true" className="h-3 w-px bg-[#263042] shrink-0" />
          <span className="shrink-0 text-[11px] font-black tracking-[0.1em] uppercase text-[var(--accent-bright)] tabular-nums">
            {songTimerText}
          </span>
          <div className="absolute bottom-0 left-5 right-5 h-[2px] bg-[#161c28] overflow-hidden">
            <div
              className="h-full bg-[var(--accent-bright)] transition-[width] duration-150"
              style={{ width: `${Math.max(0, Math.min(100, songProgressPct))}%` }}
            />
          </div>
        </div>

        {/* Zone 3: Compact Tactical Controls */}
        <nav className="flex items-center gap-2 shrink-0" aria-label="Game Controls">
          <button
            type="button"
            onClick={onOpenOrbVault}
            title="Open Orb Vault & Unlocks"
            className="tactile-key clip-chamfer-sm hidden xl:flex items-center gap-1.5 border border-[#4a3408] bg-[#211704] px-2.5 py-1.5 text-xs font-extrabold text-[#fbbf24] hover:border-[#fbbf24] cursor-pointer tabular-nums whitespace-nowrap shrink-0"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>{orbs.toLocaleString()}</span>
          </button>

          {/* Difficulty Selector */}
          <div ref={popRef} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDiffOpen((prev) => !prev);
              }}
              aria-haspopup="listbox"
              aria-expanded={diffOpen}
              className="tactile-key clip-ribbon-both flex items-center gap-1.5 border border-[#2d3648] bg-[#141820] px-3.5 py-1.5 text-xs font-bold tracking-wider text-[#f3f4f6] hover:border-[var(--accent)] cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{currentDiff.name}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#9ca3af] transition-transform duration-150 ${
                  diffOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {diffOpen && (
              <div
                role="listbox"
                aria-label="Difficulty Tiers"
                className="clip-chamfer-md absolute right-0 top-[calc(100%+6px)] z-50 w-72 border border-[#2d3648] bg-[#0b0e14] p-2 flex flex-col gap-1"
              >
                {DIFFICULTY_ORDER.map((diffId) => {
                  const diff = DIFFICULTIES[diffId];
                  const supported = activeSong.chillOnly ? diffId === 'CHILL' : true;
                  const unlocked = supported && (devUnlocked || unlockedDiffs.includes(diffId));
                  const isActive = activeDifficulty === diffId;
                  const star = activeSong.stars[diffId];

                  return (
                    <button
                      key={diffId}
                      type="button"
                      disabled={!supported}
                      onClick={() => {
                        setDiffOpen(false);
                        if (!supported) return;
                        if (!unlocked) {
                          onOpenOrbVault();
                          return;
                        }
                        onSelectDifficulty(diffId);
                      }}
                      className={`clip-chamfer-sm flex w-full flex-col items-start gap-0.5 px-2.5 py-2 text-left transition-colors ${
                        isActive
                          ? 'bg-[var(--accent-dim)] ring-1 ring-[var(--accent)]'
                          : 'hover:bg-[#141a24]'
                      } disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                    >
                      <div className="flex w-full items-center justify-between text-xs font-bold tracking-wide">
                        <span className="flex items-center gap-1.5 text-[#f3f4f6]">
                          {!unlocked && supported && <Lock className="h-3 w-3 text-[#fbbf24]" />}
                          <span>
                            {diff.name} {star ? `· ${star}` : ''}
                          </span>
                        </span>
                        <span className="tabular-nums text-[var(--accent-bright)]">
                          {!unlocked && supported
                            ? `${diff.orbCost} Orbs`
                            : `${diff.mult.toFixed(2)}x`}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#9ca3af]">
                        {!supported
                          ? 'Tutorial track is Chill-rated only'
                          : !unlocked
                          ? `Click to unlock for ${diff.orbCost} Orbs in the Vault`
                          : diff.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <HexUtilityButton
            active={equippedModsCount > 0}
            accent="theme"
            size="sm"
            onClick={onOpenMods}
            title={`Modifiers (${equippedModsCount}/3)`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </HexUtilityButton>

          <HexUtilityButton
            active
            accent="theme"
            size="md"
            onClick={onOpenPause}
            title="Pause & Settings (Esc)"
            ariaLabel="Pause Game and Open Menu"
          >
            <Pause className="h-4 w-4 fill-current" />
          </HexUtilityButton>
        </nav>
      </header>
    );
  },
);
