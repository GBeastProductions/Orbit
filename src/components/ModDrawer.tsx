import React from 'react';
import { X } from 'lucide-react';
import { MOD_CATALOG } from '../data/catalog';
import { computeTotalMultiplier } from '../engine/beatmap';
import { DifficultyId, ModCode } from '../types/game';

interface ModDrawerProps {
  open: boolean;
  equippedMods: ModCode[];
  totalHits: number;
  devUnlocked: boolean;
  activeDifficulty: DifficultyId;
  onToggleMod: (code: ModCode) => void;
  onClearMods: () => void;
  onClose: () => void;
}

export const ModDrawer: React.FC<ModDrawerProps> = ({
  open,
  equippedMods,
  totalHits,
  devUnlocked,
  activeDifficulty,
  onToggleMod,
  onClearMods,
  onClose,
}) => {
  const baseWithMods = computeTotalMultiplier(activeDifficulty, equippedMods, 0);

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="modDrawerTitle"
      className={`clip-chamfer-lg fixed bottom-0 left-1/2 z-50 flex max-h-[78dvh] w-[min(96vw,760px)] flex-col border-t-2 border-[var(--theme-primary)] bg-[#0b0e14]/98 transition-transform duration-200 ease-out ${
        open ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 translate-y-[104%] pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#1e2533] bg-[#121722] px-5 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <h3 id="modDrawerTitle" className="font-display text-sm font-black tracking-[0.16em] uppercase text-[#f3f4f6] whitespace-nowrap">
            Mod Cartridges
          </h3>
          <span className="tabular-nums text-xs font-bold text-[var(--theme-bright)] whitespace-nowrap">
            {equippedMods.length}/3 Equipped · {baseWithMods.toFixed(2)}x Base
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClearMods}
            className="clip-chamfer-sm bg-[#1a2130] px-3 py-1.5 text-xs font-semibold text-[#9ca3af] hover:text-[#f3f4f6] transition-colors cursor-pointer whitespace-nowrap"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="clip-chamfer-sm flex items-center gap-1 bg-[var(--theme-primary)] px-3.5 py-1.5 text-xs font-extrabold text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Done</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="orbit-scroll grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 overflow-y-auto p-4">
        {MOD_CATALOG.map((mod) => {
          const equipped = equippedMods.includes(mod.code);
          const unlocked = devUnlocked || totalHits >= mod.unlockHits;
          const atCap = !equipped && equippedMods.length >= 3;

          return (
            <button
              key={mod.code}
              type="button"
              disabled={!unlocked || atCap}
              onClick={() => onToggleMod(mod.code)}
              className={`clip-chamfer-md flex flex-col justify-between gap-2 p-3 text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                equipped
                  ? 'bg-[var(--theme-dim)] ring-1 ring-[var(--theme-bright)]'
                  : 'bg-[#141923] hover:bg-[#1a2230]'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#f3f4f6]">
                  [{mod.code}] {mod.name}
                </span>
                <span className="tabular-nums text-xs font-bold text-[var(--theme-bright)]">
                  {mod.mult.toFixed(2)}x
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-[#9ca3af]">{mod.desc}</p>

              <div className="flex items-center justify-between border-t border-[#1e2430] pt-2 text-[10px] font-bold tracking-wider uppercase text-[#6b7280] tabular-nums">
                <span className={equipped ? 'text-[var(--theme-bright)]' : ''}>
                  {unlocked ? (equipped ? 'Equipped' : 'Available') : `Unlocks at ${mod.unlockHits} hits`}
                </span>
                <span>{mod.code}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
