import React from 'react';
import { motion } from 'motion/react';
import { Coins, ListMusic, RotateCcw, Target } from 'lucide-react';
import { computeNextMilestone } from '../engine/beatmap';
import { LetterRank, RunSummaryData } from '../types/game';
import { ArcadeFrame } from './ArcadeChrome';
import { HitErrorHistogram, OrbitExtensionSlots } from './ExtensionSlots';

interface RunSummaryModalProps extends Pick<OrbitExtensionSlots, 'postRunSummarySlot'> {
  summary: RunSummaryData | null;
  onRetry: () => void;
  onOpenSongSelect: () => void;
  onOpenOrbVault: () => void;
}

const RANK_COLORS: Record<string, string> = {
  SS: 'text-[#fde047]',
  S: 'text-[#fbbf24]',
  A: 'text-[#34d399]',
  B: 'text-[#60a5fa]',
  C: 'text-[#c084fc]',
  D: 'text-[#fb923c]',
  F: 'text-[#ef4444]',
};

const MASTERY_RANKS: { rank: LetterRank; label: string }[] = [
  { rank: 'D', label: 'D' },
  { rank: 'C', label: 'C·Cash' },
  { rank: 'B', label: 'B' },
  { rank: 'A', label: 'A' },
  { rank: 'S', label: 'S' },
  { rank: 'SS', label: 'SS' },
];

export const RunSummaryModal: React.FC<RunSummaryModalProps> = ({
  summary,
  postRunSummarySlot,
  onRetry,
  onOpenSongSelect,
  onOpenOrbVault,
}) => {
  if (!summary) return null;

  const rankClass =
    summary.isSilverRank && (summary.rank === 'SS' || summary.rank === 'S')
      ? 'text-[#e5e7eb]'
      : RANK_COLORS[summary.rank] || 'text-[#f3f4f6]';

  const milestone = computeNextMilestone(
    summary.accuracy,
    summary.missCount,
    summary.cleared,
    summary.difficulty,
  );

  const pbDelta = summary.score - summary.previousBestScore;
  const activeRankIdx = MASTERY_RANKS.findIndex((r) => r.rank === summary.rank);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="summaryTitle"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        <ArcadeFrame accent={summary.cashOutApproved ? 'theme' : 'crimson'} size="lg">
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            {/* Header + Slammed Rank Stamp */}
            <div className="flex items-start justify-between gap-4 border-b border-[#222733] pb-3.5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--accent-bright)]">
                  {summary.cleared ? 'Calibration Complete' : 'Calibration Failed'}
                  {summary.isNewBest ? ' · Personal Best' : ''}
                </p>
                <h2 id="summaryTitle" className="font-display mt-0.5 text-xl font-black text-[#f3f4f6] truncate">
                  {summary.songTitle}
                </h2>
                <p className="text-xs text-[#9ca3af] tabular-nums">
                  {summary.artist} · {summary.difficulty}
                  {!summary.cleared && summary.missReason ? ` · ${summary.missReason} (${summary.missDegrees}°)` : ''}
                </p>
              </div>

              <div className="flex flex-col items-end shrink-0">
                <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-[#6b7280]">
                  {summary.isSilverRank ? 'Silver Rank' : 'Grade'}
                </span>
                <motion.span
                  initial={{ scale: 2.0, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.32, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className={`font-display text-5xl font-black leading-none tabular-nums ${rankClass}`}
                >
                  {summary.rank}
                </motion.span>
              </div>
            </div>

            {/* Monumental Score Hero + Personal Best Delta (Unboxed Hierarchy) */}
            <div className="flex items-end justify-between gap-4 tabular-nums">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b7280]">
                  Final Score
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-5xl sm:text-6xl font-black leading-none text-[#f3f4f6]">
                    {summary.score.toLocaleString()}
                  </span>
                  {summary.previousBestScore > 0 && (
                    <span
                      className={`text-xs font-extrabold ${
                        pbDelta >= 0 ? 'text-[var(--accent-bright)]' : 'text-[#9ca3af]'
                      }`}
                    >
                      {pbDelta >= 0 ? `+${pbDelta.toLocaleString()} PB` : `${pbDelta.toLocaleString()} vs PB`}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-end divide-x divide-[#222733] text-right">
                <div className="pr-4">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-[#6b7280]">
                    Accuracy
                  </span>
                  <span className="font-display text-2xl font-black text-[var(--accent-bright)]">
                    {summary.accuracy.toFixed(1)}%
                  </span>
                </div>
                <div className="pl-4">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-[#6b7280]">
                    Combo
                  </span>
                  <span className="font-display text-2xl font-black text-[#f3f4f6]">
                    {summary.maxCombo}x
                  </span>
                </div>
              </div>
            </div>

            {/* Zeigarnik Segmented Mastery Rail & Next Rank Hook */}
            <div className="border-y border-[#222733] py-3">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.14em] tabular-nums">
                <span className="flex items-center gap-1.5 text-[var(--accent-bright)]">
                  <Target className="h-3 w-3" />
                  <span>{milestone.gapLabel}</span>
                </span>
              </div>

              <div className="grid grid-cols-6 gap-1.5 pt-1 tabular-nums">
                {MASTERY_RANKS.map((step, idx) => {
                  const achieved = summary.cleared && activeRankIdx >= idx;
                  const isCurrent = summary.rank === step.rank;
                  return (
                    <div key={step.rank} className="flex flex-col gap-1">
                      <div
                        className={`h-1.5 w-full ${
                          achieved
                            ? step.rank === 'SS' || step.rank === 'S'
                              ? 'bg-[#fbbf24]'
                              : 'bg-[var(--accent)]'
                            : 'bg-[#1a202c]'
                        }`}
                      />
                      <span
                        className={`text-center text-[9px] font-extrabold tracking-wider ${
                          isCurrent ? 'text-white' : achieved ? 'text-[#9ca3af]' : 'text-[#4b5563]'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Orb Cash-Out Strip */}
            <div
              className={`clip-chamfer-sm flex items-center justify-between gap-3 px-3.5 py-2.5 tabular-nums border ${
                summary.cashOutApproved
                  ? 'border-[#5a3d0a] bg-[#211704]'
                  : 'border-[#5c161e] bg-[#1c0a0d]'
              }`}
            >
              <div className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#f3f4f6]">
                  <Coins className={`h-3.5 w-3.5 ${summary.cashOutApproved ? 'text-[#fbbf24]' : 'text-[#ef4444]'}`} />
                  <span>{summary.cashOutApproved ? 'Orb Cash-Out Banked' : 'Orbs Forfeited'}</span>
                </span>
                <p className="mt-0.5 text-[11px] text-[#d1d5db]">
                  {summary.cashOutApproved
                    ? `${summary.unbankedOrbs} Perfects + ${summary.rankBonusOrbs} Rank ${summary.rank} Bonus`
                    : `${summary.unbankedOrbs} unbanked Orbs lost — finish Rank C+ to Cash Out`}
                </p>
              </div>
              <span
                className={`font-display text-lg font-black shrink-0 ${
                  summary.cashOutApproved ? 'text-[#fde047]' : 'text-[#fca5a5]'
                }`}
              >
                {summary.cashOutApproved ? `+${summary.cashedOutOrbs}` : '0'}
              </span>
            </div>

            {/* Unboxed Hairline-Divided Judgment Breakdown */}
            <div className="grid grid-cols-4 divide-x divide-[#222733] text-center tabular-nums">
              <div>
                <div className="text-[9px] font-bold tracking-[0.16em] text-[#6b7280]">PERFECT</div>
                <div className="mt-0.5 text-base font-black text-white">{summary.perfectCount}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-[0.16em] text-[#6b7280]">GREAT</div>
                <div className="mt-0.5 text-base font-black text-[var(--accent-bright)]">
                  {summary.greatCount}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-[0.16em] text-[#6b7280]">GOOD</div>
                <div className="mt-0.5 text-base font-black text-[#38bdf8]">{summary.goodCount}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-[0.16em] text-[#6b7280]">MISS</div>
                <div className="mt-0.5 text-base font-black text-[#ef4444]">{summary.missCount}</div>
              </div>
            </div>

            {/* Post-Run Extension Slot: Live Hit-Error Distribution Histogram */}
            {postRunSummarySlot || <HitErrorHistogram summary={summary} />}

            <div className="flex items-center justify-between text-[11px] text-[#9ca3af] tabular-nums">
              <span>Avg Center Offset: {summary.avgOffsetDeg.toFixed(1)}°</span>
              <span>Space / J to quick retry</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onRetry}
                className="tactile-key clip-chamfer-sm flex flex-1 items-center justify-center gap-1.5 bg-[var(--accent)] px-3 py-2.5 text-xs font-black uppercase tracking-wider text-[var(--accent-on)] hover:bg-[var(--accent-bright)] cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>One More Try</span>
              </button>
              <button
                type="button"
                onClick={onOpenSongSelect}
                className="tactile-key clip-chamfer-sm flex items-center justify-center gap-1.5 border border-[#2d3648] bg-[#141820] px-3 py-2.5 text-xs font-bold text-[#f3f4f6] hover:border-[var(--accent)] cursor-pointer whitespace-nowrap"
              >
                <ListMusic className="h-3.5 w-3.5" />
                <span>Songs</span>
              </button>
              <button
                type="button"
                onClick={onOpenOrbVault}
                className="tactile-key clip-chamfer-sm flex items-center justify-center gap-1.5 border border-[#4a3408] bg-[#211704] px-3 py-2.5 text-xs font-bold text-[#fbbf24] hover:border-[#fbbf24] cursor-pointer whitespace-nowrap"
              >
                <Coins className="h-3.5 w-3.5" />
                <span>Orb Vault</span>
              </button>
            </div>
          </div>
        </ArcadeFrame>
      </motion.div>
    </div>
  );
};
