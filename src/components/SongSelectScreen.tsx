import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Coins,
  ExternalLink,
  Image as ImageIcon,
  Lock,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../data/catalog';
import { formatTimeSec } from '../engine/beatmap';
import {
  DifficultyId,
  LevelBackgroundSetting,
  PlayerProfile,
  SongDefinition,
} from '../types/game';
import { ArcadeFrame } from './ArcadeChrome';

interface SongSelectScreenProps {
  profile: PlayerProfile;
  songs: SongDefinition[];
  customAudioStatus: string;
  onBackToTitle: () => void;
  onPreviewSong: (songId: string) => void;
  onSelectDifficulty: (diffId: DifficultyId) => void;
  onStartGame: () => void;
  onOpenMods: () => void;
  onOpenOrbVault: () => void;
  onUnlockDifficulty: (diffId: DifficultyId, cost: number) => void;
  onUnlockSong: (songId: string, cost: number) => void;
  onUpdateLevelBg: (songId: string, patch: Partial<LevelBackgroundSetting>) => void;
  onResetLevelBg: (songId: string) => void;
  onLookupNewgroundsId: (ngId: string) => void;
  onUploadCustomAudio: (file: File, ngIdTag: string, targetSongId?: string) => Promise<void>;
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

async function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1280;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

export const SongSelectScreen: React.FC<SongSelectScreenProps> = ({
  profile,
  songs,
  customAudioStatus,
  onBackToTitle,
  onPreviewSong,
  onSelectDifficulty,
  onStartGame,
  onOpenMods,
  onOpenOrbVault,
  onUnlockDifficulty,
  onUnlockSong,
  onUpdateLevelBg,
  onResetLevelBg,
  onLookupNewgroundsId,
  onUploadCustomAudio,
}) => {
  const [ngInput, setNgInput] = useState('');
  const [showLevelSettings, setShowLevelSettings] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const mp3FileInputRef = useRef<HTMLInputElement>(null);
  const overrideMp3Ref = useRef<HTMLInputElement>(null);

  const selectedSong = songs.find((s) => s.id === profile.selectedSongId) || songs[0];
  const effectiveDiffId: DifficultyId = selectedSong.chillOnly ? 'CHILL' : profile.selectedDifficulty;
  const activeDiff = DIFFICULTIES[effectiveDiffId] || DIFFICULTIES.CHILL;
  const songRecord = profile.songRecords[selectedSong.id];
  const bgSetting = profile.levelBgSettings[selectedSong.id] || { dimPct: 68, blurPx: 4 };
  const songUnlocked = profile.devUnlocked || profile.unlockedSongs.includes(selectedSong.id);
  const diffUnlocked = profile.devUnlocked || profile.unlockedDiffs.includes(effectiveDiffId);
  const canLaunch = songUnlocked && diffUnlocked;
  const activeArtSrc = bgSetting.customImageDataUrl || selectedSong.bgImageUrl;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 flex h-dvh w-full flex-col overflow-hidden"
    >
      {/* Chamfered Top Bar */}
      <header className="flex h-[56px] shrink-0 items-center justify-between gap-3 border-b border-[#242c3b] bg-[#090c12]/95 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToTitle}
            className="clip-chamfer-sm flex items-center gap-1.5 bg-[#161c28] px-3 py-1.5 text-xs font-bold text-[#f3f4f6] hover:bg-[var(--theme-primary)] hover:text-[var(--theme-on-primary)] transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Menu</span>
          </button>
          <span className="font-display text-sm font-black tracking-[0.18em] uppercase text-[#f3f4f6] whitespace-nowrap">
            Beatmap Select
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenOrbVault}
            className="clip-chamfer-sm flex items-center gap-1.5 bg-[#261a04] px-3.5 py-1.5 text-xs font-extrabold text-[#fbbf24] hover:bg-[#3a2806] cursor-pointer tabular-nums whitespace-nowrap"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>{profile.orbs.toLocaleString()} Orbs</span>
          </button>
          <button
            type="button"
            onClick={onOpenMods}
            className="clip-chamfer-sm flex items-center gap-1.5 bg-[#161c28] px-3.5 py-1.5 text-xs font-bold text-[#f3f4f6] hover:bg-[#1f2838] cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--theme-bright)]" />
            <span>Mods ({profile.equippedMods.length}/3)</span>
          </button>
        </div>
      </header>

      {/* osu!lazer-Inspired 2-Column Split */}
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[440px_1fr] gap-4 p-4 sm:p-5 overflow-hidden">
        {/* LEFT COLUMN: Kenney-Style Chamfered Inspector */}
        <ArcadeFrame size="lg" className="min-h-0">
          <div className="orbit-scroll flex h-full flex-col gap-3.5 overflow-y-auto p-4">
            {/* Artwork Banner with Chamfer Cut */}
            <div className="clip-chamfer-md relative h-36 w-full shrink-0 overflow-hidden bg-[#050608]">
              {activeArtSrc && (
                <img
                  src={activeArtSrc}
                  alt={selectedSong.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/35 to-transparent" />
              <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="tabular-nums text-[10px] font-bold tracking-widest uppercase text-[var(--theme-bright)]">
                    Track {selectedSong.num} · NG #{selectedSong.newgroundsId}
                  </p>
                  <h2 className="font-display text-lg font-black text-white truncate">
                    {selectedSong.title}
                  </h2>
                  <p className="text-xs font-semibold text-[#d1d5db] truncate">{selectedSong.artist}</p>
                </div>
                {songRecord && (
                  <div className="text-right shrink-0">
                    <span className="block text-[9px] font-bold uppercase text-[#9ca3af]">Rank</span>
                    <span
                      className={`font-display text-2xl font-black leading-none tabular-nums ${
                        RANK_COLORS[songRecord.bestRank] || 'text-white'
                      }`}
                    >
                      {songRecord.bestRank}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Clean Unboxed Metadata */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[#9ca3af] tabular-nums">
              <span>{selectedSong.bpm} BPM</span>
              <span aria-hidden="true">·</span>
              <span>{selectedSong.keySig}</span>
              <span aria-hidden="true">·</span>
              <span>{formatTimeSec(selectedSong.durationSec)}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#d1d5db]">{selectedSong.genre}</span>
            </div>

            <p className="text-xs leading-relaxed text-[#9ca3af]">{selectedSong.desc}</p>

            {/* Chamfered Stats Strip */}
            <div className="grid grid-cols-3 gap-2 tabular-nums">
              <div className="clip-chamfer-sm bg-[#141a24] p-2.5">
                <div className="text-[10px] font-bold uppercase text-[#6b7280]">High Score</div>
                <div className="text-sm font-extrabold text-[#f3f4f6]">
                  {songRecord ? songRecord.bestScore.toLocaleString() : '0'}
                </div>
              </div>
              <div className="clip-chamfer-sm bg-[#141a24] p-2.5">
                <div className="text-[10px] font-bold uppercase text-[#6b7280]">Accuracy</div>
                <div className="text-sm font-extrabold text-[var(--theme-bright)]">
                  {songRecord ? `${songRecord.bestAccuracy.toFixed(1)}%` : '—'}
                </div>
              </div>
              <div className="clip-chamfer-sm bg-[#141a24] p-2.5">
                <div className="text-[10px] font-bold uppercase text-[#6b7280]">Max Combo</div>
                <div className="text-sm font-extrabold text-[#f3f4f6]">
                  {songRecord ? `${songRecord.bestCombo}x` : '0x'}
                </div>
              </div>
            </div>

            {/* Difficulty Tier Chips */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
                <span>Difficulty Tier</span>
                <span className="tabular-nums text-[var(--theme-bright)]">{activeDiff.mult.toFixed(2)}x Mult</span>
              </div>
              <div className="flex flex-wrap gap-1.5 tabular-nums">
                {(selectedSong.chillOnly ? (['CHILL'] as DifficultyId[]) : DIFFICULTY_ORDER).map((diffId) => {
                  const d = DIFFICULTIES[diffId];
                  const unlocked = profile.devUnlocked || profile.unlockedDiffs.includes(diffId);
                  const selected = effectiveDiffId === diffId;
                  const star = selectedSong.stars[diffId] || '';

                  return (
                    <button
                      key={diffId}
                      type="button"
                      onClick={() => onSelectDifficulty(diffId)}
                      className={`clip-chamfer-sm px-2.5 py-1.5 text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                        selected
                          ? 'bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                          : unlocked
                          ? 'bg-[#161c28] text-[#f3f4f6] hover:bg-[#1e2738]'
                          : 'bg-[#11151f] text-[#6b7280] hover:text-[#fbbf24]'
                      }`}
                    >
                      {diffId} {star} {!unlocked ? `(${d.orbCost})` : ''}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-[#9ca3af]">{activeDiff.desc}</p>
            </div>

            {/* Per-Level Settings: Custom BG Image + Dim/Blur + Local MP3 Pair */}
            <div className="clip-chamfer-sm bg-[#141923]">
              <button
                type="button"
                onClick={() => setShowLevelSettings((prev) => !prev)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-bold text-[#f3f4f6] hover:text-[var(--theme-bright)] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon className="h-3.5 w-3.5 text-[var(--theme-bright)]" />
                  <span>Level Settings · Art, Dim &amp; Blur</span>
                </span>
                <span className="text-[11px] text-[#9ca3af]">{showLevelSettings ? 'Hide' : 'Edit'}</span>
              </button>

              {showLevelSettings && (
                <div className="border-t border-[#222733] p-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-1 tabular-nums">
                    <div className="flex justify-between text-[11px] font-bold text-[#d1d5db]">
                      <span>Background Dim</span>
                      <span>{bgSetting.dimPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={95}
                      step={5}
                      value={bgSetting.dimPct}
                      onChange={(e) =>
                        onUpdateLevelBg(selectedSong.id, { dimPct: Number(e.target.value) })
                      }
                      className="w-full accent-[var(--theme-primary)] cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1 tabular-nums">
                    <div className="flex justify-between text-[11px] font-bold text-[#d1d5db]">
                      <span>Background Blur</span>
                      <span>{bgSetting.blurPx}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={1}
                      value={bgSetting.blurPx}
                      onChange={(e) =>
                        onUpdateLevelBg(selectedSong.id, { blurPx: Number(e.target.value) })
                      }
                      className="w-full accent-[var(--theme-primary)] cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={bgFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await resizeImageToDataUrl(file);
                          onUpdateLevelBg(selectedSong.id, { customImageDataUrl: dataUrl });
                        } catch {
                          // Ignore invalid image
                        }
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => bgFileInputRef.current?.click()}
                      className="clip-chamfer-sm flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-1.5 text-[11px] font-bold text-[#f3f4f6] hover:bg-[#1a2230] cursor-pointer"
                    >
                      <Upload className="h-3 w-3" />
                      <span>Custom BG Image</span>
                    </button>

                    {bgSetting.customImageDataUrl && (
                      <button
                        type="button"
                        onClick={() => onResetLevelBg(selectedSong.id)}
                        className="clip-chamfer-sm flex items-center gap-1 bg-[#0c1017] px-2.5 py-1.5 text-[11px] font-semibold text-[#9ca3af] hover:text-white cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Default Art</span>
                      </button>
                    )}

                    <input
                      ref={overrideMp3Ref}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onUploadCustomAudio(file, selectedSong.newgroundsId, selectedSong.id);
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => overrideMp3Ref.current?.click()}
                      className="clip-chamfer-sm flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-1.5 text-[11px] font-bold text-[#f3f4f6] hover:bg-[#1a2230] cursor-pointer"
                    >
                      <Upload className="h-3 w-3" />
                      <span>Pair Local MP3</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Launch / Unlock Action */}
            <div className="mt-auto pt-1">
              {!songUnlocked ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  disabled={profile.orbs < selectedSong.orbCost}
                  onClick={() => onUnlockSong(selectedSong.id, selectedSong.orbCost)}
                  className="clip-chamfer-md flex w-full items-center justify-center gap-2 bg-[#fbbf24] py-3.5 text-sm font-black uppercase tracking-wider text-black hover:bg-[#fde047] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer tabular-nums"
                >
                  <Lock className="h-4 w-4" />
                  <span>Unlock Track · {selectedSong.orbCost} Orbs</span>
                </motion.button>
              ) : !diffUnlocked ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  disabled={profile.orbs < activeDiff.orbCost}
                  onClick={() => onUnlockDifficulty(effectiveDiffId, activeDiff.orbCost)}
                  className="clip-chamfer-md flex w-full items-center justify-center gap-2 bg-[#fbbf24] py-3.5 text-sm font-black uppercase tracking-wider text-black hover:bg-[#fde047] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer tabular-nums"
                >
                  <Lock className="h-4 w-4" />
                  <span>Unlock {activeDiff.name} · {activeDiff.orbCost} Orbs</span>
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={!canLaunch}
                  onClick={onStartGame}
                  className="clip-chamfer-md flex w-full items-center justify-center gap-2 bg-[var(--theme-primary)] py-3.5 text-sm font-black uppercase tracking-[0.16em] text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] transition-colors cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Play Beatmap</span>
                </motion.button>
              )}
            </div>
          </div>
        </ArcadeFrame>

        {/* RIGHT COLUMN: Angled Beatmap Carousel + Newgrounds Bar */}
        <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="clip-chamfer-md flex flex-wrap items-center justify-between gap-2 bg-[#0c1017]/95 border border-[#242c3b] px-4 py-2.5">
            <div className="flex flex-1 min-w-[210px] items-center gap-2">
              <input
                type="text"
                value={ngInput}
                onChange={(e) => setNgInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Newgrounds Audio ID (e.g. 587069)"
                className="clip-chamfer-sm flex-1 bg-[#07090d] px-3 py-1.5 font-mono text-xs text-[#f3f4f6] outline-none ring-1 ring-[#2b3446] focus:ring-[var(--theme-primary)]"
              />
              <button
                type="button"
                onClick={() => onLookupNewgroundsId(ngInput)}
                className="clip-chamfer-sm bg-[var(--theme-primary)] px-3.5 py-1.5 text-xs font-extrabold text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] cursor-pointer whitespace-nowrap"
              >
                Lookup NG ID
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={mp3FileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onUploadCustomAudio(file, ngInput || 'LOCAL');
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => mp3FileInputRef.current?.click()}
                className="clip-chamfer-sm flex items-center gap-1.5 bg-[#161c28] px-3 py-1.5 text-xs font-bold text-[#f3f4f6] hover:bg-[#1e2738] cursor-pointer whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5 text-[var(--theme-bright)]" />
                <span>Import MP3</span>
              </button>
              {ngInput && (
                <a
                  href={`https://www.newgrounds.com/audio/listen/${ngInput}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-[var(--theme-bright)] hover:underline whitespace-nowrap"
                >
                  <span>NG #{ngInput}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {customAudioStatus && (
              <p className="w-full text-[11px] font-semibold text-[var(--theme-bright)]">{customAudioStatus}</p>
            )}
          </div>

          {/* Scrollable Chamfered Beatmap Carousel */}
          <div className="orbit-scroll flex-1 overflow-y-auto pr-1 pl-2 flex flex-col gap-2">
            {songs.map((song, idx) => {
              const isSelected = song.id === selectedSong.id;
              const unlocked = profile.devUnlocked || profile.unlockedSongs.includes(song.id);
              const rec = profile.songRecords[song.id];
              const bg = profile.levelBgSettings[song.id]?.customImageDataUrl || song.bgImageUrl;
              const starText = song.stars[effectiveDiffId] || song.stars.CHILL || '1.2★';

              return (
                <motion.button
                  key={song.id}
                  type="button"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: isSelected ? -6 : 0 }}
                  transition={{ duration: 0.22, delay: Math.min(idx * 0.03, 0.2) }}
                  whileHover={{ x: -8 }}
                  onClick={() => onPreviewSong(song.id)}
                  className={`clip-blade-right group relative flex items-center justify-between gap-4 p-[1.5px] text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--theme-bright)]'
                      : 'bg-[#242c3b] hover:bg-[#3e4c66]'
                  }`}
                >
                  <div
                    className={`clip-blade-right relative flex w-full items-center justify-between gap-4 p-2.5 pr-4 ${
                      isSelected ? 'bg-[#0b1f18]' : 'bg-[#0c1017]/95 group-hover:bg-[#121822]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="clip-slant-thumb relative h-14 w-28 shrink-0 overflow-hidden bg-[#050608]">
                        {bg && (
                          <img
                            src={bg}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        )}
                        {!unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                            <Lock className="h-4 w-4 text-[#fbbf24]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] tabular-nums">
                          <span>{song.num}</span>
                          <span aria-hidden="true">·</span>
                          <span>NG #{song.newgroundsId}</span>
                          <span aria-hidden="true">·</span>
                          <span>{song.bpm} BPM</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[var(--theme-bright)]">{starText}</span>
                        </div>
                        <h3 className="font-display text-base font-extrabold text-[#f3f4f6] truncate">
                          {song.title}
                        </h3>
                        <p className="text-xs text-[#9ca3af] truncate">
                          {song.artist} · {song.genre}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 tabular-nums">
                      {!unlocked ? (
                        <span className="clip-chamfer-sm bg-[#261a04] px-3 py-1 text-xs font-extrabold text-[#fbbf24]">
                          {song.orbCost} Orbs
                        </span>
                      ) : rec ? (
                        <div className="text-right">
                          <span
                            className={`font-display block text-xl font-black leading-none ${
                              RANK_COLORS[rec.bestRank] || 'text-white'
                            }`}
                          >
                            {rec.bestRank}
                          </span>
                          <span className="text-[11px] font-bold text-[#9ca3af]">
                            {rec.bestScore.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-[#6b7280]">New</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      </div>
    </motion.div>
  );
};
