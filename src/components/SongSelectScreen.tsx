import React, { useRef, useState } from 'react';
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
  D: 'text-[#ef4444]',
  F: 'text-[#ef4444]',
};

/**
 * Downscales user-uploaded background artwork cleanly so Chromebooks and localStorage stay fast.
 */
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
    <div className="relative z-10 flex h-dvh w-full flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="flex h-[54px] shrink-0 items-center justify-between gap-3 border-b border-[#222733] bg-[#0c0e12]/95 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToTitle}
            className="flex items-center gap-1.5 rounded-md border border-[#374052] bg-[#141820] px-2.5 py-1.5 text-xs font-bold text-[#f3f4f6] hover:border-[var(--theme-primary)] cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Title</span>
          </button>
          <span className="font-display text-sm font-black tracking-[0.14em] uppercase text-[#f3f4f6] whitespace-nowrap">
            Beatmap Select
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenOrbVault}
            className="flex items-center gap-1.5 rounded-md border border-[#374052] bg-[#141820] px-3 py-1.5 text-xs font-extrabold text-[#fbbf24] hover:border-[#fbbf24] cursor-pointer tabular-nums whitespace-nowrap"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>{profile.orbs.toLocaleString()} Orbs</span>
          </button>
          <button
            type="button"
            onClick={onOpenMods}
            className="flex items-center gap-1.5 rounded-md border border-[#374052] bg-[#141820] px-3 py-1.5 text-xs font-bold text-[#f3f4f6] hover:border-[var(--theme-primary)] cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Mods ({profile.equippedMods.length}/3)</span>
          </button>
        </div>
      </header>

      {/* osu!lazer-Style 2-Column Split */}
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[440px_1fr] gap-4 p-4 sm:p-5 overflow-hidden">
        {/* LEFT COLUMN: Active Track Card, Stats, Difficulty Tiers & Level Bg Settings */}
        <section className="orbit-scroll flex flex-col gap-3 overflow-y-auto rounded-xl border border-[#374052] bg-[#0c0e12]/95 p-4">
          {/* Track Artwork Banner */}
          <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-lg border border-[#222733] bg-[#050608]">
            {activeArtSrc && (
              <img
                src={activeArtSrc}
                alt={selectedSong.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
            <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
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

          {/* Metadata Strip */}
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

          {/* Local Record Strip */}
          <div className="grid grid-cols-3 gap-2 tabular-nums">
            <div className="rounded-md border border-[#222733] bg-[#141820] p-2">
              <div className="text-[10px] font-bold uppercase text-[#6b7280]">High Score</div>
              <div className="text-sm font-extrabold text-[#f3f4f6]">
                {songRecord ? songRecord.bestScore.toLocaleString() : '0'}
              </div>
            </div>
            <div className="rounded-md border border-[#222733] bg-[#141820] p-2">
              <div className="text-[10px] font-bold uppercase text-[#6b7280]">Accuracy</div>
              <div className="text-sm font-extrabold text-[var(--theme-bright)]">
                {songRecord ? `${songRecord.bestAccuracy.toFixed(1)}%` : '—'}
              </div>
            </div>
            <div className="rounded-md border border-[#222733] bg-[#141820] p-2">
              <div className="text-[10px] font-bold uppercase text-[#6b7280]">Max Combo</div>
              <div className="text-sm font-extrabold text-[#f3f4f6]">
                {songRecord ? `${songRecord.bestCombo}x` : '0x'}
              </div>
            </div>
          </div>

          {/* Difficulty Selector */}
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
                    className={`rounded-md border px-2.5 py-1.5 text-[11px] font-extrabold transition-colors cursor-pointer ${
                      selected
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                        : unlocked
                        ? 'border-[#374052] bg-[#141820] text-[#f3f4f6] hover:border-[var(--theme-primary)]'
                        : 'border-[#222733] bg-[#101218] text-[#6b7280] hover:border-[#fbbf24]'
                    }`}
                  >
                    {diffId} {star} {!unlocked ? `(${d.orbCost} Orbs)` : ''}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-[#9ca3af]">{activeDiff.desc}</p>
          </div>

          {/* Level Settings: Custom Background Image + Dim/Blur + Custom MP3 Slot */}
          <div className="rounded-lg border border-[#222733] bg-[#141820]">
            <button
              type="button"
              onClick={() => setShowLevelSettings((prev) => !prev)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-bold text-[#f3f4f6] hover:text-[var(--theme-bright)] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ImageIcon className="h-3.5 w-3.5 text-[var(--theme-bright)]" />
                <span>Level Settings · Custom Art, Dim &amp; Blur</span>
              </span>
              <span className="text-[11px] text-[#9ca3af]">{showLevelSettings ? 'Hide' : 'Edit'}</span>
            </button>

            {showLevelSettings && (
              <div className="border-t border-[#222733] p-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1 tabular-nums">
                  <div className="flex justify-between text-[11px] font-bold text-[#d1d5db]">
                    <span>Background Dim (Blackout)</span>
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
                    className="flex items-center gap-1.5 rounded border border-[#374052] bg-[#0c0e12] px-2.5 py-1.5 text-[11px] font-bold text-[#f3f4f6] hover:border-[var(--theme-primary)] cursor-pointer"
                  >
                    <Upload className="h-3 w-3" />
                    <span>Custom BG Image</span>
                  </button>

                  {bgSetting.customImageDataUrl && (
                    <button
                      type="button"
                      onClick={() => onResetLevelBg(selectedSong.id)}
                      className="flex items-center gap-1 rounded border border-[#374052] bg-[#0c0e12] px-2.5 py-1.5 text-[11px] font-semibold text-[#9ca3af] hover:text-white cursor-pointer"
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
                    className="flex items-center gap-1.5 rounded border border-[#374052] bg-[#0c0e12] px-2.5 py-1.5 text-[11px] font-bold text-[#f3f4f6] hover:border-[var(--theme-primary)] cursor-pointer"
                  >
                    <Upload className="h-3 w-3" />
                    <span>Pair Local MP3</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary Launch / Unlock CTA */}
          <div className="mt-auto pt-1 flex flex-col gap-2">
            {!songUnlocked ? (
              <button
                type="button"
                disabled={profile.orbs < selectedSong.orbCost}
                onClick={() => onUnlockSong(selectedSong.id, selectedSong.orbCost)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#fbbf24] py-3 text-sm font-black uppercase tracking-wider text-black hover:bg-[#fde047] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer tabular-nums"
              >
                <Lock className="h-4 w-4" />
                <span>Unlock Track for {selectedSong.orbCost} Orbs</span>
              </button>
            ) : !diffUnlocked ? (
              <button
                type="button"
                disabled={profile.orbs < activeDiff.orbCost}
                onClick={() => onUnlockDifficulty(effectiveDiffId, activeDiff.orbCost)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#fbbf24] py-3 text-sm font-black uppercase tracking-wider text-black hover:bg-[#fde047] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer tabular-nums"
              >
                <Lock className="h-4 w-4" />
                <span>Unlock {activeDiff.name} for {activeDiff.orbCost} Orbs</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!canLaunch}
                onClick={onStartGame}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--theme-primary)] py-3 text-sm font-black uppercase tracking-[0.14em] text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] transition-colors cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Play Beatmap</span>
              </button>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: osu!lazer Beatmap Carousel + Newgrounds Loader */}
        <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
          {/* Newgrounds ID Lookup Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#222733] bg-[#0c0e12]/95 px-3.5 py-2.5">
            <div className="flex flex-1 min-w-[210px] items-center gap-2">
              <input
                type="text"
                value={ngInput}
                onChange={(e) => setNgInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter Newgrounds Song ID (e.g. 587069)"
                className="flex-1 rounded-md border border-[#374052] bg-[#07080b] px-3 py-1.5 font-mono text-xs text-[#f3f4f6] outline-none focus:border-[var(--theme-primary)]"
              />
              <button
                type="button"
                onClick={() => onLookupNewgroundsId(ngInput)}
                className="rounded-md bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-bold text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] cursor-pointer whitespace-nowrap"
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
                className="flex items-center gap-1.5 rounded-md border border-[#374052] bg-[#141820] px-3 py-1.5 text-xs font-bold text-[#f3f4f6] hover:border-[var(--theme-primary)] cursor-pointer whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5" />
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

          {/* Scrollable Song Carousel */}
          <div className="orbit-scroll flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {songs.map((song) => {
              const isSelected = song.id === selectedSong.id;
              const unlocked = profile.devUnlocked || profile.unlockedSongs.includes(song.id);
              const rec = profile.songRecords[song.id];
              const bg = profile.levelBgSettings[song.id]?.customImageDataUrl || song.bgImageUrl;
              const starText = song.stars[effectiveDiffId] || song.stars.CHILL || '1.2★';

              return (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => onPreviewSong(song.id)}
                  className={`group relative flex items-center justify-between gap-4 rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'translate-x-0 sm:-translate-x-2 border-[var(--theme-primary)] bg-[#0d1814]'
                      : 'border-[#222733] bg-[#0c0e12]/90 hover:border-[#374052] hover:bg-[#141820]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md border border-[#222733] bg-[#050608]">
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
                      <span className="rounded border border-[#fbbf24]/50 bg-[#261a04] px-2.5 py-1 text-xs font-extrabold text-[#fbbf24]">
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
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
