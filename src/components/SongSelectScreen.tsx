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
  Shuffle,
  SlidersHorizontal,
  Target,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../data/catalog';
import { computeNextMilestone, formatTimeSec } from '../engine/beatmap';
import {
  DifficultyId,
  LevelBackgroundSetting,
  PlayerProfile,
  SongDefinition,
} from '../types/game';
import { DiscCartridge } from './DiscCartridge';
import { OrbitExtensionSlots, PreGameModRack } from './ExtensionSlots';
import { HexUtilityButton, OrbitOrnamentalCrest } from './OrbitVectorAssets';

interface SongSelectScreenProps extends OrbitExtensionSlots {
  profile: PlayerProfile;
  songs: SongDefinition[];
  customAudioStatus: string;
  onBackToTitle: () => void;
  onPreviewSong: (songId: string) => void;
  onRandomSong: () => void;
  onToggleMusic: () => void;
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

export const SongSelectScreen: React.FC<SongSelectScreenProps> = React.memo(({
  profile,
  songs,
  customAudioStatus,
  topLeftBadgeSlot,
  preGameModRackSlot,
  onBackToTitle,
  onPreviewSong,
  onRandomSong,
  onToggleMusic,
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

  const selectedIndex = Math.max(
    0,
    songs.findIndex((s) => s.id === profile.selectedSongId),
  );
  const selectedSong = songs[selectedIndex] || songs[0];
  const effectiveDiffId: DifficultyId = selectedSong.chillOnly
    ? 'CHILL'
    : profile.selectedDifficulty;
  const activeDiff = DIFFICULTIES[effectiveDiffId] || DIFFICULTIES.CHILL;
  const songRecord = profile.songRecords[selectedSong.id];
  const bgSetting = profile.levelBgSettings[selectedSong.id] || { dimPct: 68, blurPx: 4 };
  const songUnlocked = profile.devUnlocked || profile.unlockedSongs.includes(selectedSong.id);
  const diffUnlocked = profile.devUnlocked || profile.unlockedDiffs.includes(effectiveDiffId);
  const canLaunch = songUnlocked && diffUnlocked;
  const activeArtSrc = bgSetting.customImageDataUrl || selectedSong.bgImageUrl;

  const milestone = songRecord
    ? computeNextMilestone(
        songRecord.bestAccuracy,
        songRecord.bestRank === 'SS' || songRecord.bestRank === 'S' ? 0 : 1,
        songRecord.bestRank !== 'F',
        effectiveDiffId,
      )
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 flex h-dvh w-full flex-col justify-between overflow-hidden"
    >
      {/* Left Directional Readability Gradient Scrim (lets real photography shine across center/right) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[58%] bg-gradient-to-r from-[#050608]/94 via-[#050608]/76 to-transparent"
      />

      {/* TOP-LEFT DIAGONAL HEADER WEDGE (osu!-inspired header bar) */}
      <div className="relative z-20 flex flex-wrap items-start justify-between gap-3 pt-0 pr-4">
        <div className="clip-ribbon-right flex items-center gap-4 border-b border-[var(--accent)]/50 bg-[#080b11]/95 py-2.5 pl-5 pr-10">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--accent-bright)] tabular-nums">
              <span>Disc {selectedSong.num}</span>
              <span aria-hidden="true">·</span>
              <span>NG #{selectedSong.newgroundsId}</span>
              {topLeftBadgeSlot}
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
              {selectedSong.title}{' '}
              <span className="text-sm font-bold text-[#9ca3af]">— {selectedSong.artist}</span>
            </h1>
          </div>
        </div>

        {/* Top-Right Compact Newgrounds ID & MP3 Import Strip */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <div className="clip-chamfer-sm flex items-center gap-1.5 border border-[#2b3446] bg-[#080b11]/92 px-2.5 py-1">
            <input
              type="text"
              value={ngInput}
              onChange={(e) => setNgInput(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Newgrounds ID (e.g. 587069)"
              className="w-40 sm:w-48 bg-transparent font-mono text-xs text-[#f3f4f6] outline-none placeholder:text-[#6b7280]"
            />
            <button
              type="button"
              onClick={() => onLookupNewgroundsId(ngInput)}
              className="tactile-key clip-chamfer-sm bg-[var(--accent)] px-2.5 py-1 text-[11px] font-black text-[var(--accent-on)] hover:bg-[var(--accent-bright)] cursor-pointer whitespace-nowrap"
            >
              Lookup
            </button>
          </div>

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
            className="tactile-key clip-chamfer-sm flex items-center gap-1.5 border border-[#2b3446] bg-[#080b11]/92 px-3 py-1.5 text-xs font-bold text-[#f3f4f6] hover:border-[var(--accent)] cursor-pointer whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5 text-[var(--accent-bright)]" />
            <span>Import MP3</span>
          </button>

          {ngInput && (
            <a
              href={`https://www.newgrounds.com/audio/listen/${ngInput}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-[var(--accent-bright)] hover:underline whitespace-nowrap"
            >
              <span>NG #{ngInput}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {customAudioStatus && (
        <div className="relative z-20 px-5 pt-1">
          <p className="text-[11px] font-bold text-[var(--accent-bright)]">{customAudioStatus}</p>
        </div>
      )}

      {/* MAIN ASYMMETRIC STAGE: Unboxed Left Cartridge Telemetry + Curved Arc Beatmap Stack */}
      <div className="relative z-10 grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[440px_1fr] gap-4 px-4 sm:px-6 py-3 overflow-hidden">
        {/* LEFT COLUMN: Unboxed Floating Telemetry & Cartridge */}
        <div className="orbit-scroll flex min-h-0 flex-col gap-3.5 overflow-y-auto pr-2">
          {/* Optical Disc Cartridge + Song Stats */}
          <div className="flex items-center gap-4 pt-1">
            <DiscCartridge
              title={selectedSong.title}
              num={selectedSong.num}
              bpm={selectedSong.bpm}
              imageUrl={activeArtSrc}
              locked={!songUnlocked}
              size="md"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#d1d5db] tabular-nums">
                  <span className="text-[var(--accent-bright)]">{selectedSong.bpm} BPM</span>
                  <span className="text-[#4b5563]">/</span>
                  <span>{selectedSong.keySig}</span>
                  <span className="text-[#4b5563]">/</span>
                  <span>{formatTimeSec(selectedSong.durationSec)}</span>
                </div>
                {songRecord && (
                  <span
                    className={`font-display text-3xl font-black leading-none tabular-nums ${
                      RANK_COLORS[songRecord.bestRank] || 'text-white'
                    }`}
                  >
                    {songRecord.bestRank}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                {selectedSong.genre}
              </p>
              <p className="mt-1.5 text-xs leading-snug text-[#d1d5db] line-clamp-2">
                {selectedSong.desc}
              </p>
            </div>
          </div>

          <OrbitOrnamentalCrest className="w-full max-w-[340px] opacity-60" />

          {/* Unboxed Personal Best Hairline Strip */}
          <div className="grid grid-cols-3 divide-x divide-[#263042] border-y border-[#222733] py-2.5 text-center tabular-nums">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9ca3af]">
                High Score
              </div>
              <div className="font-display mt-0.5 text-2xl font-black text-white">
                {songRecord ? songRecord.bestScore.toLocaleString() : '0'}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9ca3af]">
                Accuracy
              </div>
              <div className="font-display mt-0.5 text-2xl font-black text-[var(--accent-bright)]">
                {songRecord ? `${songRecord.bestAccuracy.toFixed(1)}%` : '—'}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9ca3af]">
                Max Combo
              </div>
              <div className="font-display mt-0.5 text-2xl font-black text-white">
                {songRecord ? `${songRecord.bestCombo}x` : '0x'}
              </div>
            </div>
          </div>

          {/* Zeigarnik Next-Rank Target Stripe */}
          <div className="border-l-2 border-[var(--accent-bright)] bg-[#090d14]/85 px-3 py-2">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent-bright)] tabular-nums">
              <span className="flex items-center gap-1.5">
                <Target className="h-3 w-3" />
                <span>{milestone ? 'Next Rank Target' : 'Orb Cash-Out Rule'}</span>
              </span>
              {milestone?.nextRank && <span>→ {milestone.nextRank}</span>}
            </div>
            <p className="mt-0.5 text-xs font-medium text-[#e5e7eb]">
              {milestone
                ? milestone.gapLabel
                : 'Clear with Rank C+ (62% Acc) to bank Perfect Strike Orbs.'}
            </p>
          </div>

          {/* Difficulty Tier Selector */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">
              <span>Subdivision Tier</span>
              <span className="tabular-nums text-[var(--accent-bright)]">
                {activeDiff.mult.toFixed(2)}x Mult
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 tabular-nums">
              {(selectedSong.chillOnly ? (['CHILL'] as DifficultyId[]) : DIFFICULTY_ORDER).map(
                (diffId) => {
                  const d = DIFFICULTIES[diffId];
                  const unlocked = profile.devUnlocked || profile.unlockedDiffs.includes(diffId);
                  const selected = effectiveDiffId === diffId;
                  const star = selectedSong.stars[diffId] || '';

                  return (
                    <button
                      key={diffId}
                      type="button"
                      onClick={() => onSelectDifficulty(diffId)}
                      className={`tactile-key clip-chamfer-sm border px-2.5 py-1.5 text-[11px] font-extrabold cursor-pointer whitespace-nowrap ${
                        selected
                          ? 'border-[var(--accent-bright)] bg-[var(--accent)] text-[var(--accent-on)]'
                          : unlocked
                          ? 'border-[#2d3648] bg-[#0d1118]/92 text-[#f3f4f6] hover:border-[#6b7280]'
                          : 'border-[#222733] bg-[#090b10]/90 text-[#6b7280] hover:text-[#fbbf24]'
                      }`}
                    >
                      {diffId} {star} {!unlocked ? `(${d.orbCost})` : ''}
                    </button>
                  );
                },
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-[#9ca3af]">{activeDiff.desc}</p>
          </div>

          {/* Extension Slot: Pre-Game Modifiers */}
          {preGameModRackSlot || (
            <PreGameModRack
              equippedMods={profile.equippedMods}
              activeDifficulty={effectiveDiffId}
              onOpenMods={onOpenMods}
            />
          )}

          {/* Progressive Disclosure: Custom Per-Song Art, Dim & Blur */}
          <div className="border-t border-[#222733] pt-2">
            <button
              type="button"
              onClick={() => setShowLevelSettings((prev) => !prev)}
              className="flex w-full items-center justify-between py-1 text-xs font-bold text-[#e5e7eb] hover:text-[var(--accent-bright)] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ImageIcon className="h-3.5 w-3.5 text-[var(--accent-bright)]" />
                <span>Level Art, Dim &amp; Blur Settings</span>
              </span>
              <span className="text-[11px] text-[#9ca3af]">
                {showLevelSettings ? 'Hide' : 'Customize'}
              </span>
            </button>

            {showLevelSettings && (
              <div className="mt-2 bg-[#080b10]/90 border border-[#222733] p-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1 tabular-nums">
                  <div className="flex justify-between text-[11px] font-bold text-[#d1d5db]">
                    <span>Gameplay Dim</span>
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
                    className="w-full accent-[var(--accent)] cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1 tabular-nums">
                  <div className="flex justify-between text-[11px] font-bold text-[#d1d5db]">
                    <span>Gameplay Blur</span>
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
                    className="w-full accent-[var(--accent)] cursor-pointer"
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
                    className="tactile-key clip-chamfer-sm flex items-center gap-1.5 border border-[#2d3648] bg-[#141820] px-2.5 py-1.5 text-[11px] font-bold text-[#f3f4f6] hover:border-[var(--accent)] cursor-pointer"
                  >
                    <Upload className="h-3 w-3" />
                    <span>Custom BG Image</span>
                  </button>

                  {bgSetting.customImageDataUrl && (
                    <button
                      type="button"
                      onClick={() => onResetLevelBg(selectedSong.id)}
                      className="tactile-key clip-chamfer-sm flex items-center gap-1 border border-[#2d3648] bg-[#141820] px-2.5 py-1.5 text-[11px] font-semibold text-[#9ca3af] hover:text-white cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Default Photo</span>
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
                    className="tactile-key clip-chamfer-sm flex items-center gap-1.5 border border-[#2d3648] bg-[#141820] px-2.5 py-1.5 text-[11px] font-bold text-[#f3f4f6] hover:border-[var(--accent)] cursor-pointer"
                  >
                    <Upload className="h-3 w-3" />
                    <span>Pair Local MP3</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: OSU-STYLE CURVED ARC-FANNED BEATMAP CAROUSEL */}
        <section className="relative flex min-h-0 flex-col justify-center overflow-hidden">
          <div className="orbit-scroll flex h-full flex-col gap-2 overflow-y-auto py-3 pl-6 pr-2">
            {songs.map((song, idx) => {
              const isSelected = song.id === selectedSong.id;
              const unlocked = profile.devUnlocked || profile.unlockedSongs.includes(song.id);
              const rec = profile.songRecords[song.id];
              const bg =
                profile.levelBgSettings[song.id]?.customImageDataUrl || song.bgImageUrl;
              const starText = song.stars[effectiveDiffId] || song.stars.CHILL || '1.2★';

              // Classic osu! horizontal arc curvature based on vertical distance from active beatmap
              const dist = Math.abs(idx - selectedIndex);
              const arcOffsetX = isSelected ? -20 : Math.min(48, Math.pow(dist, 1.35) * 10);

              return (
                <motion.button
                  key={song.id}
                  type="button"
                  animate={{ x: arcOffsetX }}
                  whileHover={{ x: isSelected ? -24 : arcOffsetX - 10 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => {
                    if (isSelected && canLaunch) {
                      onStartGame();
                    } else {
                      onPreviewSong(song.id);
                    }
                  }}
                  className={`tactile-key clip-ribbon-both group relative flex shrink-0 items-center justify-between gap-4 p-[1.5px] text-left cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-bright)]'
                      : 'bg-[#252d3d]/90 hover:bg-[#495773]'
                  }`}
                >
                  <div
                    className={`clip-ribbon-both relative flex w-full items-center justify-between gap-4 py-2 pl-3 pr-6 ${
                      isSelected ? 'bg-[#082219]' : 'bg-[#0a0d13]/92 group-hover:bg-[#121722]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Slanted Real Photography Cover Slice */}
                      <div className="clip-slant-thumb relative h-14 w-28 sm:w-32 shrink-0 overflow-hidden bg-[#050608]">
                        {bg && (
                          <img
                            src={bg}
                            alt=""
                            referrerPolicy="no-referrer"
                            className={`h-full w-full object-cover transition-transform duration-300 ${
                              isSelected ? 'scale-105' : 'group-hover:scale-105'
                            }`}
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
                          <span className="text-[#f3f4f6]">{song.num}</span>
                          <span aria-hidden="true">·</span>
                          <span>{song.bpm} BPM</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[var(--accent-bright)]">{starText}</span>
                        </div>
                        <h3 className="font-display text-sm sm:text-base font-black text-white truncate">
                          {song.title}
                        </h3>
                        <p className="text-[11px] text-[#9ca3af] truncate">
                          {song.artist} · {song.genre}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 tabular-nums">
                      {!unlocked ? (
                        <span className="clip-chamfer-sm border border-[#4a3408] bg-[#211704] px-3 py-1 text-xs font-extrabold text-[#fbbf24]">
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
                          <span className="text-[11px] font-bold text-[#d1d5db]">
                            {rec.bestScore.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6b7280]">
                          {isSelected ? 'Tap Again ▶' : 'Unplayed'}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      </div>

      {/* FLAT BOTTOM TACTICAL ACTION DOCK + CORNER PLAY TRIGGER ORB (osu! + GD inspired) */}
      <footer className="relative z-20 flex h-[60px] shrink-0 items-center justify-between border-t border-[#222733] bg-[#07090d]/96 pl-3 sm:pl-5">
        {/* Left/Center Action Switches */}
        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pr-2">
          <button
            type="button"
            onClick={onBackToTitle}
            className="tactile-key clip-chamfer-sm flex items-center gap-1.5 border border-[#2d3648] bg-[#141820] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-[#f3f4f6] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-on)] cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>

          <HexUtilityButton
            active={profile.musicEnabled}
            accent="theme"
            size="sm"
            onClick={onToggleMusic}
            title={profile.musicEnabled ? 'Mute Preview' : 'Play Preview'}
          >
            {profile.musicEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-[#6b7280]" />
            )}
          </HexUtilityButton>

          <button
            type="button"
            onClick={onRandomSong}
            className="tactile-key clip-chamfer-sm flex items-center gap-1.5 border border-[#2d3648] bg-[#141820] px-3 py-2 text-xs font-bold text-[#e5e7eb] hover:border-[var(--accent)] cursor-pointer whitespace-nowrap"
          >
            <Shuffle className="h-3.5 w-3.5 text-[var(--accent-bright)]" />
            <span className="hidden sm:inline">Random</span>
          </button>

          <button
            type="button"
            onClick={onOpenMods}
            className="tactile-key clip-chamfer-sm flex items-center gap-1.5 border border-[#2d3648] bg-[#141820] px-3 py-2 text-xs font-bold text-[#f3f4f6] hover:border-[var(--accent)] cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--accent-bright)]" />
            <span>Mods ({profile.equippedMods.length}/3)</span>
          </button>

          <button
            type="button"
            onClick={onOpenOrbVault}
            className="tactile-key clip-chamfer-sm flex items-center gap-1.5 border border-[#4a3408] bg-[#211704] px-3 py-2 text-xs font-extrabold text-[#fbbf24] hover:border-[#fbbf24] cursor-pointer tabular-nums whitespace-nowrap"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>{profile.orbs.toLocaleString()} Orbs</span>
          </button>
        </div>

        {/* Bottom-Right Winged PLAY / UNLOCK Trigger */}
        <div className="relative h-full flex items-center shrink-0">
          {!songUnlocked ? (
            <button
              type="button"
              disabled={profile.orbs < selectedSong.orbCost}
              onClick={() => onUnlockSong(selectedSong.id, selectedSong.orbCost)}
              className="tactile-key clip-play-wing flex h-full items-center gap-2.5 bg-[#fbbf24] pl-10 pr-6 text-xs sm:text-sm font-black uppercase tracking-wider text-black hover:bg-[#fde047] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer tabular-nums whitespace-nowrap"
            >
              <Lock className="h-4 w-4" />
              <span>Unlock {selectedSong.orbCost} Orbs</span>
            </button>
          ) : !diffUnlocked ? (
            <button
              type="button"
              disabled={profile.orbs < activeDiff.orbCost}
              onClick={() => onUnlockDifficulty(effectiveDiffId, activeDiff.orbCost)}
              className="tactile-key clip-play-wing flex h-full items-center gap-2.5 bg-[#fbbf24] pl-10 pr-6 text-xs sm:text-sm font-black uppercase tracking-wider text-black hover:bg-[#fde047] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer tabular-nums whitespace-nowrap"
            >
              <Lock className="h-4 w-4" />
              <span>Unlock {activeDiff.name} ({activeDiff.orbCost})</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!canLaunch}
              onClick={onStartGame}
              className="tactile-key clip-play-wing group relative flex h-[74px] -mt-[14px] items-center gap-3 bg-[var(--accent)] pl-11 pr-7 text-sm sm:text-base font-black uppercase tracking-[0.2em] text-[var(--accent-on)] hover:bg-[var(--accent-bright)] cursor-pointer whitespace-nowrap"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/20 transition-transform group-hover:scale-110">
                <Play className="h-4 w-4 translate-x-0.5 fill-current" />
              </span>
              <span className="font-display">PLAY</span>
            </button>
          )}
        </div>
      </footer>
    </motion.div>
  );
});
