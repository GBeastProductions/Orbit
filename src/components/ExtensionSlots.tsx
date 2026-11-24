import React from 'react';
import { MOD_CATALOG } from '../data/catalog';
import { computeModMultiplier } from '../engine/beatmap';
import { DifficultyId, ModCode, RunSummaryData } from '../types/game';

/**
 * Typed Extension Slots allowing future modules (daily modifiers, rival ghosts, achievements,
 * external telemetry) to mount cleanly without rewriting core UI screens.
 */
export interface OrbitExtensionSlots {
  topLeftBadgeSlot?: React.ReactNode;
  preGameModRackSlot?: React.ReactNode;
  postRunSummarySlot?: React.ReactNode;
}

/**
 * Default Post-Run Extension Widget:
 * 15-Bin Hit-Error Distribution Histogram (-Early .. 0° .. +Late)
 */
export const HitErrorHistogram: React.FC<{ summary: RunSummaryData }> = ({ summary }) => {
  const binCount = 15;
  const bins = new Array<number>(binCount).fill(0);
  for (const s of summary.offsetSamples) {
    const norm = Math.max(-1, Math.min(0.999, s));
    const idx = Math.floor(((norm + 1) / 2) * binCount);
    bins[Math.max(0, Math.min(binCount - 1, idx))] += 1;
  }
  const maxBin = Math.max(1, ...bins);
  const centerIdx = Math.floor(binCount / 2);

  // Mean signed skew
  const avgSkew =
    summary.offsetSamples.length > 0
      ? summary.offsetSamples.reduce((a, b) => a + b, 0) / summary.offsetSamples.length
      : 0;
  const skewLabel =
    summary.offsetSamples.length === 0
      ? 'No hits sampled'
      : Math.abs(avgSkew) < 0.08
      ? 'Centered Timing'
      : avgSkew < 0
      ? 'Tending Early'
      : 'Tending Late';

  return (
    <div className="border-t border-[#222733] pt-3">
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af] tabular-nums">
        <span>Timing Distribution (Early ◀ 0° ▶ Late)</span>
        <span className="text-[var(--accent-bright)]">{skewLabel}</span>
      </div>

      <div className="flex h-11 items-end gap-1 border-b border-[#222733] pb-1">
        {bins.map((count, i) => {
          const pct = count > 0 ? Math.max(14, Math.round((count / maxBin) * 100)) : 6;
          const isCenter = Math.abs(i - centerIdx) <= 1;
          const isEdge = Math.abs(i - centerIdx) >= 5;
          const barColor =
            count === 0
              ? 'bg-[#1a202c]'
              : isCenter
              ? 'bg-[#ffffff]'
              : isEdge
              ? 'bg-[#38bdf8]'
              : 'bg-[var(--accent)]';

          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end h-full">
              <div
                className={`w-full transition-all duration-200 ${barColor}`}
                style={{ height: `${pct}%` }}
                title={`${count} hits`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Default Pre-Game Mod Rack Extension Widget:
 * Compact tactical cartridge strip mounted on Song Select.
 */
export const PreGameModRack: React.FC<{
  equippedMods: ModCode[];
  activeDifficulty: DifficultyId;
  onOpenMods: () => void;
}> = ({ equippedMods, activeDifficulty, onOpenMods }) => {
  const modMult = computeModMultiplier(equippedMods);

  return (
    <div className="flex items-center justify-between gap-3 border-y border-[#222733] py-2.5">
      <div className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#6b7280]">
          Mod Cartridge Rack · {activeDifficulty}
        </span>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 tabular-nums">
          {equippedMods.length === 0 ? (
            <span className="text-xs font-semibold text-[#9ca3af]">Standard Calibration (1.00x)</span>
          ) : (
            equippedMods.map((code) => {
              const def = MOD_CATALOG.find((m) => m.code === code);
              return (
                <span
                  key={code}
                  className="clip-chamfer-sm border border-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 text-[10px] font-black text-[var(--accent-bright)]"
                >
                  {code} {def ? `${def.mult.toFixed(2)}x` : ''}
                </span>
              );
            })
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenMods}
        className="tactile-key clip-chamfer-sm shrink-0 border border-[#374052] bg-[#141820] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#f3f4f6] hover:border-[var(--accent)] hover:text-[var(--accent-bright)] cursor-pointer tabular-nums"
      >
        {equippedMods.length > 0 ? `${modMult.toFixed(2)}x · Edit` : 'Load Mods'}
      </button>
    </div>
  );
};
