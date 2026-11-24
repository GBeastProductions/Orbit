import React from 'react';
import { BookOpen, Coins, ListMusic, Play, Settings, Sparkles } from 'lucide-react';
import { PlayerProfile, SongDefinition } from '../types/game';

interface TitleScreenProps {
  profile: PlayerProfile;
  activeSong: SongDefinition;
  onEnterSongSelect: () => void;
  onStartTutorial: () => void;
  onOpenOrbVault: () => void;
  onOpenSettings: () => void;
  onOpenIndex: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  profile,
  activeSong,
  onEnterSongSelect,
  onStartTutorial,
  onOpenOrbVault,
  onOpenSettings,
  onOpenIndex,
}) => {
  return (
    <div className="relative z-10 flex h-dvh w-full flex-col justify-between p-5 sm:p-8">
      {/* Top Retro Arcade Header */}
      <header className="flex items-center justify-between gap-4 border-b border-[#222733] bg-[#0c0e12]/90 px-4 py-3 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="font-display text-base font-black tracking-[0.22em] text-[#f3f4f6]">
            ORBIT
          </span>
          <span className="hidden sm:inline text-xs font-semibold text-[#9ca3af]">
            Retro Arcade Calibration
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold tabular-nums">
          <button
            type="button"
            onClick={onOpenOrbVault}
            className="flex items-center gap-1.5 rounded-md border border-[#374052] bg-[#141820] px-3 py-1.5 text-[#fbbf24] hover:border-[#fbbf24] transition-colors cursor-pointer"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>{profile.orbs.toLocaleString()} Orbs</span>
          </button>
          <span className="hidden sm:inline text-[#9ca3af]">
            Best: <strong className="text-[#f3f4f6]">{profile.bestScore.toLocaleString()}</strong>
          </span>
          <span className="hidden md:inline text-[#9ca3af]">
            Hits: <strong className="text-[#f3f4f6]">{profile.totalHits.toLocaleString()}</strong>
          </span>
        </div>
      </header>

      {/* Center Interactive osu!lazer-Inspired Emblem + Arcade Action Stack */}
      <main className="flex flex-col items-center justify-center gap-6 my-auto py-4">
        <button
          type="button"
          onClick={onEnterSongSelect}
          className="animate-arcade-pulse group relative flex h-52 w-52 sm:h-60 sm:w-60 flex-col items-center justify-center rounded-full border-4 border-[var(--theme-primary)] bg-[#0c0e12] transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-[#374052] group-hover:border-[var(--theme-bright)]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-7 rounded-full border border-[#222733]"
          />
          <Play className="h-10 w-10 fill-[var(--theme-primary)] text-[var(--theme-primary)] transition-transform group-hover:scale-110" />
          <span className="font-display mt-2 text-2xl font-black tracking-[0.2em] text-[#f3f4f6]">
            PLAY
          </span>
          <span className="mt-1 text-[11px] font-bold tracking-widest uppercase text-[var(--theme-bright)]">
            {profile.tutorialSongCompleted ? 'Beatmap Select' : 'Start Calibration'}
          </span>
        </button>

        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#f3f4f6]">
            Precision Circular Rhythm
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#9ca3af]">
            Pure 1.0x Newgrounds soundtracks, 15 orbital wave mechanics, and Orb Cash-Out mastery.
          </p>
        </div>

        {/* Arcade Menu Buttons */}
        <div className="grid w-full max-w-xl grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={onEnterSongSelect}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--theme-primary)] bg-[var(--theme-dim)] px-3 py-3 text-xs font-extrabold tracking-wider uppercase text-[var(--theme-bright)] hover:bg-[var(--theme-primary)] hover:text-[var(--theme-on-primary)] transition-colors cursor-pointer whitespace-nowrap"
          >
            <ListMusic className="h-4 w-4" />
            <span>Songs</span>
          </button>

          <button
            type="button"
            onClick={onStartTutorial}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#374052] bg-[#0c0e12] px-3 py-3 text-xs font-extrabold tracking-wider uppercase text-[#f3f4f6] hover:border-[var(--theme-primary)] hover:bg-[#141820] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4 text-[#fde047]" />
            <span>Tutorial</span>
          </button>

          <button
            type="button"
            onClick={onOpenOrbVault}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#374052] bg-[#0c0e12] px-3 py-3 text-xs font-extrabold tracking-wider uppercase text-[#fbbf24] hover:border-[#fbbf24] hover:bg-[#141820] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Coins className="h-4 w-4" />
            <span>Orb Vault</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#374052] bg-[#0c0e12] px-3 py-3 text-xs font-extrabold tracking-wider uppercase text-[#f3f4f6] hover:border-[var(--theme-primary)] hover:bg-[#141820] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Settings className="h-4 w-4" />
            <span>Options</span>
          </button>
        </div>
      </main>

      {/* Bottom Now-Loaded Track Strip */}
      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#222733] bg-[#0c0e12]/90 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-[var(--theme-bright)]">Active Track:</span>
          <span className="truncate font-semibold text-[#f3f4f6]">
            {activeSong.title} — {activeSong.artist}
          </span>
          <span className="hidden sm:inline text-[#6b7280] tabular-nums">
            · NG #{activeSong.newgroundsId} · {activeSong.bpm} BPM
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenIndex}
          className="flex items-center gap-1.5 text-xs font-bold text-[#9ca3af] hover:text-[var(--theme-bright)] transition-colors cursor-pointer whitespace-nowrap"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>15 Wave Modes Index</span>
        </button>
      </footer>
    </div>
  );
};
