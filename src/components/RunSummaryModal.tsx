import React from 'react';
import { Coins, ListMusic, RotateCcw } from 'lucide-react';
import { RunSummaryData } from '../types/game';

interface RunSummaryModalProps {
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

export const RunSummaryModal: React.FC<RunSummaryModalProps> = ({
  summary,
  onRetry,
  onOpenSongSelect,
  onOpenOrbVault,
}) => {
  if (!summary) return null;

  const rankClass =
    summary.isSilverRank && (summary.rank === 'SS' || summary.rank === 'S')
      ? 'text-[#e5e7eb]'
      : RANK_COLORS[summary.rank] || 'text-[#f3f4f6]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="summaryTitle"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-[#374052] bg-[#0c0e12] p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 border-b border-[#222733] pb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-widest uppercase text-[var(--theme-bright)]">
              {summary.cleared ? 'Track Cleared' : 'Calibration Failed'}
              {summary.isNewBest ? ' · New Record' : ''}
            </p>
            <h2 id="summaryTitle" className="font-display text-xl font-extrabold text-[#f3f4f6] truncate">
              {summary.songTitle}
            </h2>
            <p className="text-xs text-[#9ca3af] tabular-nums">
              {summary.artist} · {summary.difficulty}
              {!summary.cleared && summary.missReason ? ` · ${summary.missReason} (${summary.missDegrees}°)` : ''}
            </p>
          </div>

          <div className="flex flex-col items-center shrink-0 px-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#6b7280]">
              {summary.isSilverRank ? 'Silver' : 'Rank'}
            </span>
            <span className={`font-display text-4xl font-black leading-none tabular-nums ${rankClass}`}>
              {summary.rank}
            </span>
          </div>
        </div>

        {/* Orb Cash-Out Panel */}
        <div
          className={`rounded-lg border p-3 tabular-nums ${
            summary.cashOutApproved
              ? 'border-[#fbbf24]/60 bg-[#241904]/80'
              : 'border-[#7f1d1d] bg-[#1f0b0e]/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#f3f4f6]">
              <Coins className={`h-4 w-4 ${summary.cashOutApproved ? 'text-[#fbbf24]' : 'text-[#ef4444]'}`} />
              <span>{summary.cashOutApproved ? 'Orb Cash-Out Banked' : 'Orbs Forfeited'}</span>
            </span>
            <span
              className={`text-sm font-black ${
                summary.cashOutApproved ? 'text-[#fde047]' : 'text-[#fca5a5]'
              }`}
            >
              {summary.cashOutApproved ? `+${summary.cashedOutOrbs} Orbs` : '0 Orbs'}
            </span>
          </div>

          {summary.cashOutApproved ? (
            <p className="mt-1 text-[11px] text-[#fde68a]">
              {summary.unbankedOrbs} Perfect Strike Orbs + {summary.rankBonusOrbs} Rank {summary.rank} Bonus banked cleanly.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[#fca5a5]">
              {summary.unbankedOrbs} unbanked Orbs forfeited — finish with Rank C or higher to Cash Out.
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 tabular-nums">
          <div className="rounded-md border border-[#222733] bg-[#141820] p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#6b7280]">Score</div>
            <div className="text-lg font-extrabold text-[#f3f4f6]">{summary.score.toLocaleString()}</div>
          </div>
          <div className="rounded-md border border-[#222733] bg-[#141820] p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#6b7280]">Max Combo</div>
            <div className="text-lg font-extrabold text-[#f3f4f6]">{summary.maxCombo}x</div>
          </div>
          <div className="rounded-md border border-[#222733] bg-[#141820] p-2.5">
            <div className="text-[10px] font-bold uppercase text-[#6b7280]">Accuracy</div>
            <div className="text-lg font-extrabold text-[var(--theme-bright)]">{summary.accuracy.toFixed(1)}%</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center tabular-nums">
          <div className="rounded border border-[#222733] bg-[#141820] py-2">
            <div className="text-[10px] font-bold text-[#9ca3af]">PERFECT</div>
            <div className="text-sm font-extrabold text-white">{summary.perfectCount}</div>
          </div>
          <div className="rounded border border-[#222733] bg-[#141820] py-2">
            <div className="text-[10px] font-bold text-[#9ca3af]">GREAT</div>
            <div className="text-sm font-extrabold text-[var(--theme-bright)]">{summary.greatCount}</div>
          </div>
          <div className="rounded border border-[#222733] bg-[#141820] py-2">
            <div className="text-[10px] font-bold text-[#9ca3af]">GOOD</div>
            <div className="text-sm font-extrabold text-[#38bdf8]">{summary.goodCount}</div>
          </div>
          <div className="rounded border border-[#222733] bg-[#141820] py-2">
            <div className="text-[10px] font-bold text-[#9ca3af]">MISS</div>
            <div className="text-sm font-extrabold text-[#ef4444]">{summary.missCount}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#9ca3af] tabular-nums">
          <span>Avg Center Offset: {summary.avgOffsetDeg.toFixed(1)}°</span>
          <span>Space / J to quick retry</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[var(--theme-primary)] px-3 py-2 text-xs font-bold text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Play Again</span>
          </button>
          <button
            type="button"
            onClick={onOpenSongSelect}
            className="flex items-center justify-center gap-1.5 rounded-md border border-[#374052] bg-[#141820] px-3 py-2 text-xs font-semibold text-[#f3f4f6] hover:border-[var(--theme-primary)] transition-colors cursor-pointer whitespace-nowrap"
          >
            <ListMusic className="h-3.5 w-3.5" />
            <span>Song Select</span>
          </button>
          <button
            type="button"
            onClick={onOpenOrbVault}
            className="flex items-center justify-center gap-1.5 rounded-md border border-[#fbbf24]/50 bg-[#261a04] px-3 py-2 text-xs font-bold text-[#fbbf24] hover:border-[#fbbf24] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>Orb Vault</span>
          </button>
        </div>
      </div>
    </div>
  );
};
