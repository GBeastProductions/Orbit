import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Pause, SlidersHorizontal } from 'lucide-react';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../data/catalog';
import { DifficultyId, SongDefinition } from '../types/game';

interface TopBarProps {
  activeSong: SongDefinition;
  activeDifficulty: DifficultyId;
  unlockedDiffs: DifficultyId[];
  devUnlocked: boolean;
  equippedModsCount: number;
  totalMultiplier: number;
  beatLedIndex: number;
  onOpenTracks: () => void;
  onSelectDifficulty: (diffId: DifficultyId) => void;
  onOpenMods: () => void;
  onOpenPause: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeSong,
  activeDifficulty,
  unlockedDiffs,
  devUnlocked,
  equippedModsCount,
  totalMultiplier,
  beatLedIndex,
  onOpenTracks,
  onSelectDifficulty,
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
    <header className="flex h-[54px] items-center justify-between gap-4 border-b border-[#222733] bg-[#050608] px-4 sm:px-6 z-20">
      {/* Zone 1: Brand + Active Track Trigger */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-display text-sm font-extrabold tracking-[0.16em] text-[#f3f4f6] whitespace-nowrap shrink-0">
          ORBIT
        </span>
        <div className="hidden sm:flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`h-1.5 w-1.5 rounded-full border transition-colors duration-75 ${
                beatLedIndex === idx
                  ? 'border-white bg-[var(--theme-bright)]'
                  : 'border-[#2e3545] bg-[#161a23]'
              }`}
            />
          ))}
        </div>
        <span className="hidden md:inline text-[#374052]" aria-hidden="true">
          /
        </span>
        <button
          type="button"
          onClick={onOpenTracks}
          className="truncate max-w-[160px] sm:max-w-[260px] text-left text-xs font-semibold text-[#9ca3af] hover:text-[var(--theme-bright)] transition-colors cursor-pointer whitespace-nowrap"
          title="Open Track Library & Newgrounds Loader"
        >
          {activeSong.num} · {activeSong.title}
        </button>
      </div>

      {/* Zone 2 & 3: Compact Tactical Controls */}
      <nav className="flex items-center gap-2 shrink-0" aria-label="Game Controls">
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
            className="flex items-center gap-2 rounded-md border border-[#374052] bg-[#0c0e12] px-3 py-1.5 text-xs font-bold tracking-wider text-[#f3f4f6] hover:border-[var(--theme-primary)] hover:bg-[#141820] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>{currentDiff.name}</span>
            <span className="tabular-nums text-[var(--theme-bright)]">
              {currentDiff.mult.toFixed(2)}x
            </span>
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
              className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 rounded-lg border border-[#374052] bg-[#0c0e12] p-1.5 flex flex-col gap-1"
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
                    disabled={!unlocked}
                    onClick={() => {
                      if (!unlocked) return;
                      setDiffOpen(false);
                      onSelectDifficulty(diffId);
                    }}
                    className={`flex w-full flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-left transition-colors ${
                      isActive
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-dim)]'
                        : 'border-transparent hover:border-[#222733] hover:bg-[#141820]'
                    } disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                  >
                    <div className="flex w-full items-center justify-between text-xs font-bold tracking-wide">
                      <span className="text-[#f3f4f6]">
                        {diff.name} {star ? `· ${star}` : ''} {!unlocked ? '(Locked)' : ''}
                      </span>
                      <span className="tabular-nums text-[var(--theme-bright)]">
                        {diff.mult.toFixed(2)}x
                      </span>
                    </div>
                    <span className="text-[11px] text-[#9ca3af]">
                      {!supported
                        ? 'Tutorial track is Chill-rated only'
                        : !unlocked
                        ? 'Clear previous tier or use Dev code'
                        : diff.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mods Rack Button */}
        <button
          type="button"
          onClick={onOpenMods}
          className="flex items-center gap-1.5 rounded-md border border-[#222733] bg-[#0c0e12] px-3 py-1.5 text-xs font-semibold text-[#f3f4f6] hover:border-[#374052] hover:bg-[#141820] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-[#9ca3af]" />
          <span>Mods</span>
          <span className="tabular-nums text-[var(--theme-bright)]">
            {equippedModsCount}/3
          </span>
        </button>

        {/* Live Total Mult Readout (compact desktop metadata) */}
        <span className="hidden lg:inline-block tabular-nums text-xs font-bold text-[#9ca3af] px-1 whitespace-nowrap shrink-0">
          {totalMultiplier.toFixed(2)}x Total
        </span>

        {/* Primary Action: Pause Menu */}
        <button
          type="button"
          onClick={onOpenPause}
          aria-label="Pause Game and Open Menu"
          title="Pause & Library (Esc)"
          className="flex items-center justify-center gap-1.5 rounded-md border border-[#374052] bg-[#141820] px-3 py-1.5 text-xs font-bold text-[#f3f4f6] hover:border-[var(--theme-primary)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Pause className="h-3.5 w-3.5 fill-current" />
          <span className="hidden sm:inline">Menu</span>
        </button>
      </nav>
    </header>
  );
};
