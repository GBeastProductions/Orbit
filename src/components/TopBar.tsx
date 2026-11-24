import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Coins, Lock, Pause, SlidersHorizontal } from 'lucide-react';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../data/catalog';
import { DifficultyId, SongDefinition } from '../types/game';

interface TopBarProps {
  activeSong: SongDefinition;
  activeDifficulty: DifficultyId;
  unlockedDiffs: DifficultyId[];
  devUnlocked: boolean;
  equippedModsCount: number;
  totalMultiplier: number;
  orbs: number;
  beatLedIndex: number;
  onBackToSongSelect: () => void;
  onSelectDifficulty: (diffId: DifficultyId) => void;
  onOpenOrbVault: () => void;
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
  orbs,
  beatLedIndex,
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
    <header className="flex h-[54px] items-center justify-between gap-3 border-b border-[#1e2636] bg-[#07090d]/95 px-3 sm:px-5 z-20">
      {/* Zone 1: Back to Song Select + Brand + Track */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onBackToSongSelect}
          className="clip-chamfer-sm flex items-center gap-1 bg-[#141a24] px-2.5 py-1.5 text-xs font-bold text-[#f3f4f6] hover:bg-[var(--theme-primary)] hover:text-[var(--theme-on-primary)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Back to Beatmap Select"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Songs</span>
        </button>

        <span className="font-display text-sm font-black tracking-[0.18em] text-[#f3f4f6] whitespace-nowrap shrink-0">
          ORBIT
        </span>

        <div className="hidden md:flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`h-1.5 w-1.5 rotate-45 transition-colors duration-75 ${
                beatLedIndex === idx
                  ? 'bg-[var(--theme-bright)]'
                  : 'bg-[#1b2230]'
              }`}
            />
          ))}
        </div>

        <span className="hidden md:inline text-[#2b3446]" aria-hidden="true">
          /
        </span>

        <button
          type="button"
          onClick={onBackToSongSelect}
          className="truncate max-w-[130px] sm:max-w-[240px] text-left text-xs font-semibold text-[#9ca3af] hover:text-[var(--theme-bright)] transition-colors cursor-pointer whitespace-nowrap"
          title="Switch Beatmap Track"
        >
          {activeSong.num} · {activeSong.title}
        </button>
      </div>

      {/* Zone 2 & 3: Compact Tactical Controls */}
      <nav className="flex items-center gap-2 shrink-0" aria-label="Game Controls">
        <button
          type="button"
          onClick={onOpenOrbVault}
          title="Open Orb Vault & Unlocks"
          className="clip-chamfer-sm hidden sm:flex items-center gap-1.5 bg-[#241904] px-2.5 py-1.5 text-xs font-extrabold text-[#fbbf24] hover:bg-[#382706] transition-colors cursor-pointer tabular-nums whitespace-nowrap shrink-0"
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
            className="clip-chamfer-sm flex items-center gap-2 bg-[#141a24] px-2.5 sm:px-3 py-1.5 text-xs font-bold tracking-wider text-[#f3f4f6] hover:bg-[#1b2332] transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
                        ? 'bg-[var(--theme-dim)] ring-1 ring-[var(--theme-primary)]'
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
                      <span className="tabular-nums text-[var(--theme-bright)]">
                        {!unlocked && supported ? `${diff.orbCost} Orbs` : `${diff.mult.toFixed(2)}x`}
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

        {/* Mods Rack Button */}
        <button
          type="button"
          onClick={onOpenMods}
          className="clip-chamfer-sm flex items-center gap-1.5 bg-[#141a24] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#f3f4f6] hover:bg-[#1b2332] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-[#9ca3af]" />
          <span className="hidden sm:inline">Mods</span>
          <span className="tabular-nums text-[var(--theme-bright)]">
            {equippedModsCount}/3
          </span>
        </button>

        {/* Live Total Mult Readout */}
        <span className="hidden lg:inline-block tabular-nums text-xs font-bold text-[#9ca3af] px-1 whitespace-nowrap shrink-0">
          {totalMultiplier.toFixed(2)}x Total
        </span>

        {/* Primary Action: Pause Menu */}
        <button
          type="button"
          onClick={onOpenPause}
          aria-label="Pause Game and Open Menu"
          title="Pause & Settings (Esc)"
          className="clip-chamfer-sm flex items-center justify-center gap-1.5 bg-[var(--theme-primary)] px-2.5 sm:px-3 py-1.5 text-xs font-extrabold text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Pause className="h-3.5 w-3.5 fill-current" />
          <span className="hidden sm:inline">Menu</span>
        </button>
      </nav>
    </header>
  );
};
