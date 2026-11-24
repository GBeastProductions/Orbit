import React, { useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Coins,
  ExternalLink,
  Gamepad2,
  Home,
  ListMusic,
  Lock,
  Settings,
  Upload,
  Volume2,
} from 'lucide-react';
import {
  CHASSIS_THEMES,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  MOD_CATALOG,
  WAVE_MODES,
} from '../data/catalog';
import { formatTimeSec } from '../engine/beatmap';
import {
  BgFxMode,
  DifficultyId,
  HitSfxMode,
  PauseTabId,
  PlayerProfile,
  SongDefinition,
  ThemeId,
  WaveModeId,
} from '../types/game';
import { ArcadeSwitch } from './ArcadeChrome';

interface PausePanelProps {
  open: boolean;
  activeTab: PauseTabId;
  onChangeTab: (tab: PauseTabId) => void;
  mustChooseTrack: boolean;
  profile: PlayerProfile;
  songs: SongDefinition[];
  listeningSlot: 0 | 1 | 2;
  onStartRebind: (slot: 1 | 2) => void;
  onResume: () => void;
  onGoToSongSelect: () => void;
  onGoToTitle: () => void;
  onOpenOrbVault: () => void;
  onSelectTrack: (songId: string, diffId: DifficultyId) => void;
  onLookupNewgroundsId: (ngId: string) => void;
  onUploadCustomAudio: (file: File, ngIdTag: string) => Promise<void>;
  customAudioStatus: string;
  onTogglePointer: () => void;
  onReplayTutorial: () => void;
  onUpdateAudioOffset: (ms: number) => void;
  onToggleMusic: () => void;
  onMusicVolume: (vol: number) => void;
  onToggleSound: () => void;
  onSfxVolume: (vol: number) => void;
  onSelectHitSfx: (mode: HitSfxMode) => void;
  onSelectTheme: (theme: ThemeId) => void;
  onSelectBgFx: (mode: BgFxMode) => void;
  onDevUnlock: (code: string) => boolean;
  onResetCareer: () => void;
  onResetDefaults: () => void;
  onTestWaveSandbox: (modeId: WaveModeId) => void;
}

const TAB_TITLES: Record<PauseTabId, string> = {
  main: 'Player Stats',
  tracks: 'Beatmap Library',
  ctrl: 'Controls & Timing',
  audio: 'Audio & SFX',
  disp: 'Display & Dev',
  index: 'Field Index',
};

export const PausePanel: React.FC<PausePanelProps> = ({
  open,
  activeTab,
  onChangeTab,
  mustChooseTrack,
  profile,
  songs,
  listeningSlot,
  onStartRebind,
  onResume,
  onGoToSongSelect,
  onGoToTitle,
  onOpenOrbVault,
  onSelectTrack,
  onLookupNewgroundsId,
  onUploadCustomAudio,
  customAudioStatus,
  onTogglePointer,
  onReplayTutorial,
  onUpdateAudioOffset,
  onToggleMusic,
  onMusicVolume,
  onToggleSound,
  onSfxVolume,
  onSelectHitSfx,
  onSelectTheme,
  onSelectBgFx,
  onDevUnlock,
  onResetCareer,
  onResetDefaults,
  onTestWaveSandbox,
}) => {
  const [ngInput, setNgInput] = useState('');
  const [devInput, setDevInput] = useState('');
  const [devError, setDevError] = useState('');
  const [confirmCareerReset, setConfirmCareerReset] = useState(false);
  const [codexTab, setCodexTab] = useState<'modes' | 'mods' | 'tiers'>('modes');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSong = songs.find((s) => s.id === profile.selectedSongId) || songs[0];
  const activeDiff = DIFFICULTIES[profile.selectedDifficulty] || DIFFICULTIES.CHILL;

  const totalAttempts = profile.totalHits + profile.totalMisses;
  const accuracyPct = totalAttempts > 0 ? ((profile.totalHits / totalAttempts) * 100).toFixed(1) : '100.0';
  const perfectPct = profile.totalHits > 0 ? ((profile.totalPerfects / totalAttempts) * 100).toFixed(1) : '0.0';
  const avgOffset = profile.totalHits > 0 ? (profile.offsetDegSum / profile.totalHits).toFixed(1) : '0.0';
  const cmRatio =
    profile.totalMisses > 0
      ? (profile.totalHits / profile.totalMisses).toFixed(2)
      : profile.totalHits.toFixed(2);
  const totalDirMisses = profile.earlyMisses + profile.lateMisses;
  const earlyPct = totalDirMisses > 0 ? Math.round((profile.earlyMisses / totalDirMisses) * 100) : 50;

  const handleDevSubmit = () => {
    const ok = onDevUnlock(devInput.trim());
    if (ok) {
      setDevInput('');
      setDevError('');
    } else {
      setDevError('Invalid access code');
    }
  };

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="pausePanelHeading"
      className={`fixed top-0 right-0 bottom-0 z-50 grid w-[min(94vw,530px)] grid-cols-[1fr_60px] border-l border-[var(--theme-primary)]/40 bg-[#090c12]/98 transition-transform duration-200 ease-out ${
        open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
    >
      {/* Main Content Column */}
      <div className="flex h-full min-w-0 flex-col border-r border-[#1e2533]">
        <div className="relative flex items-center justify-between gap-2 border-b border-[#1e2533] bg-[#111620] px-4 py-3.5">
          {/* Top Accent Laser Edge */}
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--theme-bright)] via-[var(--theme-primary)]/40 to-transparent"
          />

          <div className="min-w-0">
            <p className="tabular-nums text-[10px] font-extrabold tracking-[0.18em] uppercase text-[var(--theme-bright)]">
              {mustChooseTrack ? 'Choose Next Track' : 'Orbit Calibration'}
            </p>
            <h2 id="pausePanelHeading" className="font-display text-base font-black uppercase tracking-wider text-[#f3f4f6]">
              {TAB_TITLES[activeTab]}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onGoToTitle}
              title="Return to Title Menu"
              className="clip-chamfer-sm bg-[#1a2230] p-2 text-[#9ca3af] hover:text-[#f3f4f6] cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpenOrbVault}
              className="clip-chamfer-sm flex items-center gap-1 bg-[#261a04] px-2.5 py-1.5 text-[11px] font-extrabold text-[#fbbf24] hover:bg-[#3a2806] cursor-pointer tabular-nums whitespace-nowrap"
            >
              <Coins className="h-3 w-3" />
              <span>{profile.orbs}</span>
            </button>
            <button
              type="button"
              onClick={onResume}
              className="clip-chamfer-sm bg-[var(--theme-primary)] px-3.5 py-1.5 text-xs font-extrabold text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] transition-colors cursor-pointer whitespace-nowrap"
            >
              {mustChooseTrack ? 'Pick Track' : 'Close'}
            </button>
          </div>
        </div>

        <div className="orbit-scroll flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
          {/* TAB 1: STATS */}
          {activeTab === 'main' && (
            <>
              <div className="border-b border-[#1e2533] pb-1.5 text-[11px] font-bold tracking-widest uppercase text-[#6b7280]">
                Personal Records &amp; Orb Bank
              </div>
              <div className="grid grid-cols-3 gap-2 tabular-nums">
                <div className="clip-chamfer-sm bg-[var(--theme-dim)] ring-1 ring-[var(--theme-primary)]/60 p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#9ca3af]">Best Score</div>
                  <div className="text-lg font-extrabold text-[#f3f4f6]">{profile.bestScore.toLocaleString()}</div>
                  <div className="text-[11px] text-[#9ca3af]">All-Time</div>
                </div>
                <div className="clip-chamfer-sm bg-[#141923] p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#6b7280]">{activeDiff.name} Best</div>
                  <div className="text-lg font-extrabold text-[#f3f4f6]">
                    {(profile.tierBestScores[activeDiff.id] || 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#9ca3af]">Active Tier</div>
                </div>
                <div className="clip-chamfer-sm bg-[#241904]/80 ring-1 ring-[#fbbf24]/40 p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#fbbf24]">Orb Bank</div>
                  <div className="text-lg font-extrabold text-[#fde047]">{profile.orbs.toLocaleString()}</div>
                  <div className="text-[11px] text-[#fde68a]">{profile.totalOrbsEarned} Earned</div>
                </div>
              </div>

              <div className="border-b border-[#1e2533] pb-1.5 text-[11px] font-bold tracking-widest uppercase text-[#6b7280]">
                Timing &amp; Accuracy
              </div>
              <div className="grid grid-cols-2 gap-2 tabular-nums">
                <div className="clip-chamfer-sm bg-[#141923] p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#6b7280]">Hit / Miss Ratio</div>
                  <div className="text-lg font-extrabold text-[#f3f4f6]">{cmRatio}</div>
                  <div className="text-[11px] text-[#9ca3af]">
                    {profile.totalHits} Hits · {profile.totalMisses} Misses
                  </div>
                </div>
                <div className="clip-chamfer-sm bg-[#141923] p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#6b7280]">Hit Accuracy</div>
                  <div className="text-lg font-extrabold text-[var(--theme-bright)]">{accuracyPct}%</div>
                  <div className="text-[11px] text-[#9ca3af]">Overall Precision</div>
                </div>
                <div className="clip-chamfer-sm bg-[#141923] p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#6b7280]">Perfect Bullseyes</div>
                  <div className="text-lg font-extrabold text-[#f3f4f6]">{perfectPct}%</div>
                  <div className="text-[11px] text-[#9ca3af]">{profile.totalPerfects} Inner-Core Hits</div>
                </div>
                <div className="clip-chamfer-sm bg-[#141923] p-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#6b7280]">Avg Center Offset</div>
                  <div className="text-lg font-extrabold text-[#f3f4f6]">{avgOffset}°</div>
                  <div className="text-[11px] text-[#9ca3af]">Peak Streak: {profile.bestStreak}x</div>
                </div>
              </div>

              <div className="clip-chamfer-sm bg-[#141923] p-3 tabular-nums">
                <div className="mb-1.5 flex justify-between text-[11px] font-bold text-[#9ca3af]">
                  <span>EARLY MISSES: {profile.earlyMisses} ({earlyPct}%)</span>
                  <span>LATE MISSES: {profile.lateMisses} ({100 - earlyPct}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden bg-[#07090d]">
                  <div
                    className="h-full bg-[var(--theme-primary)] transition-[width] duration-200"
                    style={{ width: `${earlyPct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onGoToSongSelect}
                  className="clip-chamfer-sm bg-[#161c28] py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#f3f4f6] hover:bg-[var(--theme-primary)] hover:text-[var(--theme-on-primary)] transition-colors cursor-pointer"
                >
                  Open Song Select
                </button>
                <button
                  type="button"
                  onClick={() => onChangeTab('index')}
                  className="clip-chamfer-sm bg-[#161c28] py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#f3f4f6] hover:bg-[#222b3d] transition-colors cursor-pointer"
                >
                  Open Field Index
                </button>
              </div>
            </>
          )}

          {/* TAB 2: QUICK TRACKS + NEWGROUNDS ID LOADER */}
          {activeTab === 'tracks' && (
            <>
              <div className="clip-chamfer-sm flex items-center justify-between gap-2 bg-[#141923] px-3 py-2.5">
                <span className="text-xs font-semibold text-[#d1d5db]">
                  Custom artwork, Dim &amp; Blur settings are in Song Select
                </span>
                <button
                  type="button"
                  onClick={onGoToSongSelect}
                  className="clip-chamfer-sm bg-[var(--theme-primary)] px-3 py-1 text-[11px] font-extrabold text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] cursor-pointer whitespace-nowrap"
                >
                  Song Select
                </button>
              </div>

              <div className="clip-chamfer-md bg-[#141923] p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#f3f4f6]">
                    Newgrounds ID &amp; Custom Audio
                  </span>
                  <span className="text-[10px] font-bold text-[#9ca3af]">1.0x Pure Sync</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ngInput}
                    onChange={(e) => setNgInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Newgrounds ID (e.g. 587069)"
                    className="clip-chamfer-sm flex-1 bg-[#07090d] px-2.5 py-1.5 font-mono text-xs text-[#f3f4f6] outline-none ring-1 ring-[#2b3446] focus:ring-[var(--theme-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => onLookupNewgroundsId(ngInput)}
                    className="clip-chamfer-sm bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-extrabold text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] cursor-pointer whitespace-nowrap"
                  >
                    Lookup ID
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onUploadCustomAudio(file, ngInput || 'Custom');
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="clip-chamfer-sm flex items-center gap-1.5 bg-[#0c1017] px-2.5 py-1.5 text-xs font-semibold text-[#f3f4f6] hover:bg-[#1b2230] cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-[var(--theme-bright)]" />
                    <span>Load Local MP3 / OGG</span>
                  </button>
                  {ngInput && (
                    <a
                      href={`https://www.newgrounds.com/audio/listen/${ngInput}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold text-[var(--theme-bright)] hover:underline"
                    >
                      <span>NG #{ngInput}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {customAudioStatus && (
                  <p className="text-[11px] font-semibold text-[var(--theme-bright)]">{customAudioStatus}</p>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {songs.map((song) => {
                  const isCurrent = profile.selectedSongId === song.id;
                  const songUnlocked = profile.devUnlocked || profile.unlockedSongs.includes(song.id);
                  const rec = profile.songRecords[song.id];
                  const tiers = song.chillOnly ? (['CHILL'] as DifficultyId[]) : DIFFICULTY_ORDER;

                  return (
                    <div
                      key={song.id}
                      className={`clip-chamfer-md p-3 flex flex-col gap-2 ${
                        isCurrent
                          ? 'bg-[#0b1f18] ring-1 ring-[var(--theme-primary)]'
                          : 'bg-[#141923]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#6b7280] tabular-nums">
                        <span>
                          Track {song.num} · NG #{song.newgroundsId} · {song.bpm} BPM · {formatTimeSec(song.durationSec)}
                        </span>
                        <span className="text-[#9ca3af]">
                          {!songUnlocked
                            ? `${song.orbCost} Orbs`
                            : rec
                            ? `${rec.bestRank} · ${rec.bestScore.toLocaleString()}`
                            : 'Unplayed'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-display text-sm font-extrabold text-[#f3f4f6]">
                          {song.title} — {song.artist}
                        </h3>
                        <p className="text-[11px] font-semibold text-[var(--theme-bright)]">
                          {song.genre} · {song.keySig}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1 tabular-nums">
                        {!songUnlocked ? (
                          <button
                            type="button"
                            onClick={onOpenOrbVault}
                            className="clip-chamfer-sm flex items-center gap-1 bg-[#261a04] px-2.5 py-1 text-[11px] font-bold text-[#fbbf24] cursor-pointer"
                          >
                            <Lock className="h-3 w-3" />
                            <span>Unlock in Orb Vault ({song.orbCost} Orbs)</span>
                          </button>
                        ) : (
                          tiers.map((diffId) => {
                            const unlocked = profile.devUnlocked || profile.unlockedDiffs.includes(diffId);
                            const selected = isCurrent && profile.selectedDifficulty === diffId;
                            const star = song.stars[diffId] || '';

                            return (
                              <button
                                key={diffId}
                                type="button"
                                onClick={() => {
                                  if (!unlocked) {
                                    onOpenOrbVault();
                                    return;
                                  }
                                  onSelectTrack(song.id, diffId);
                                }}
                                className={`clip-chamfer-sm px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                                  selected
                                    ? 'bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                                    : unlocked
                                    ? 'bg-[#0c1017] text-[#f3f4f6] hover:bg-[#1b2333]'
                                    : 'bg-[#0c1017] text-[#6b7280] hover:text-[#fbbf24]'
                                }`}
                              >
                                {diffId} {star} {!unlocked ? `(${DIFFICULTIES[diffId].orbCost} Orbs)` : ''}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* TAB 3: CONTROLS & TIMING */}
          {activeTab === 'ctrl' && (
            <>
              <div className="border-b border-[#1e2533] pb-1.5 text-[11px] font-bold tracking-widest uppercase text-[#6b7280]">
                Trigger Keybinds
              </div>

              <div className="clip-chamfer-sm flex items-center justify-between gap-3 bg-[#141923] p-3">
                <div>
                  <div className="text-xs font-bold text-[#f3f4f6]">Primary Trigger (Trigger 1)</div>
                  <div className="text-[11px] text-[#9ca3af]">Default Spacebar</div>
                </div>
                <button
                  type="button"
                  onClick={() => onStartRebind(1)}
                  className={`clip-chamfer-sm px-3.5 py-1.5 text-xs font-extrabold tabular-nums cursor-pointer ${
                    listeningSlot === 1
                      ? 'bg-[#f59e0b] text-black'
                      : 'bg-[#0c1017] text-[#f3f4f6] ring-1 ring-[#2e384b] hover:ring-[var(--theme-primary)]'
                  }`}
                >
                  {listeningSlot === 1 ? 'PRESS KEY...' : profile.trigger1Label}
                </button>
              </div>

              <div className="clip-chamfer-sm flex items-center justify-between gap-3 bg-[#141923] p-3">
                <div>
                  <div className="text-xs font-bold text-[#f3f4f6]">Secondary Trigger (Trigger 2)</div>
                  <div className="text-[11px] text-[#9ca3af]">Alternate key for fast double-taps</div>
                </div>
                <button
                  type="button"
                  onClick={() => onStartRebind(2)}
                  className={`clip-chamfer-sm px-3.5 py-1.5 text-xs font-extrabold tabular-nums cursor-pointer ${
                    listeningSlot === 2
                      ? 'bg-[#f59e0b] text-black'
                      : 'bg-[#0c1017] text-[#f3f4f6] ring-1 ring-[#2e384b] hover:ring-[var(--theme-primary)]'
                  }`}
                >
                  {listeningSlot === 2 ? 'PRESS KEY...' : profile.trigger2Label}
                </button>
              </div>

              <div className="clip-chamfer-sm flex items-center justify-between gap-3 bg-[#141923] p-3">
                <div>
                  <div className="text-xs font-bold text-[#f3f4f6]">Mouse / Touch Ring Tap</div>
                  <div className="text-[11px] text-[#9ca3af]">Click or tap the calibration dial directly</div>
                </div>
                <ArcadeSwitch checked={profile.allowPointerTap} onToggle={onTogglePointer} />
              </div>

              <div className="clip-chamfer-sm bg-[#141923] p-3 flex flex-col gap-2 tabular-nums">
                <div className="flex justify-between text-xs font-bold text-[#d1d5db]">
                  <span>Audio Latency Calibration Offset</span>
                  <span className="text-[var(--theme-bright)]">
                    {profile.audioOffsetMs >= 0 ? `+${profile.audioOffsetMs}` : profile.audioOffsetMs} ms
                  </span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={5}
                  value={profile.audioOffsetMs}
                  onChange={(e) => onUpdateAudioOffset(Number(e.target.value))}
                  className="w-full accent-[var(--theme-primary)] cursor-pointer"
                />
                <p className="text-[11px] text-[#9ca3af]">
                  Adjust if Bluetooth headphones or Chromebook speakers feel slightly ahead or behind the beat.
                </p>
              </div>

              <div className="clip-chamfer-sm flex items-center justify-between gap-3 bg-[#141923] p-3">
                <div>
                  <div className="text-xs font-bold text-[#f3f4f6]">Tutorial Replay</div>
                  <div className="text-[11px] text-[#9ca3af]">Replay Moments Passing Us with dial slow-mo guides</div>
                </div>
                <button
                  type="button"
                  onClick={onReplayTutorial}
                  className="clip-chamfer-sm bg-[var(--theme-primary)] px-3.5 py-1.5 text-xs font-extrabold text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] cursor-pointer whitespace-nowrap"
                >
                  Start Guide
                </button>
              </div>
            </>
          )}

          {/* TAB 4: AUDIO & SFX */}
          {activeTab === 'audio' && (
            <>
              <div className="border-b border-[#1e2533] pb-1.5 text-[11px] font-bold tracking-widest uppercase text-[#6b7280]">
                Soundtrack Engine (Pure 1.0x)
              </div>

              <div className="clip-chamfer-sm flex items-center justify-between gap-3 bg-[#141923] p-3">
                <div>
                  <div className="text-xs font-bold text-[#f3f4f6]">Song Playback</div>
                  <div className="text-[11px] text-[#9ca3af]">
                    {activeSong.num} · {activeSong.title}
                  </div>
                </div>
                <ArcadeSwitch checked={profile.musicEnabled} onToggle={onToggleMusic} />
              </div>

              <div className="clip-chamfer-sm bg-[#141923] p-3 flex flex-col gap-2 tabular-nums">
                <div className="flex justify-between text-xs font-bold text-[#d1d5db]">
                  <span>Music Volume</span>
                  <span>{profile.musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={profile.musicVolume}
                  onChange={(e) => onMusicVolume(Number(e.target.value))}
                  className="w-full accent-[var(--theme-primary)] cursor-pointer"
                />
              </div>

              <div className="border-b border-[#1e2533] pb-1.5 text-[11px] font-bold tracking-widest uppercase text-[#6b7280]">
                Tactile Hit SFX
              </div>

              <div className="clip-chamfer-sm flex items-center justify-between gap-3 bg-[#141923] p-3">
                <div>
                  <div className="text-xs font-bold text-[#f3f4f6]">Hit &amp; Alert Sounds</div>
                  <div className="text-[11px] text-[#9ca3af]">Zero-latency Web Audio synthesis</div>
                </div>
                <ArcadeSwitch checked={profile.soundEnabled} onToggle={onToggleSound} />
              </div>

              <div className="clip-chamfer-sm bg-[#141923] p-3 flex flex-col gap-2 tabular-nums">
                <div className="flex justify-between text-xs font-bold text-[#d1d5db]">
                  <span>SFX Volume</span>
                  <span>{profile.sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={profile.sfxVolume}
                  onChange={(e) => onSfxVolume(Number(e.target.value))}
                  className="w-full accent-[var(--theme-primary)] cursor-pointer"
                />
              </div>

              <div className="clip-chamfer-sm bg-[#141923] p-3 flex flex-col gap-2">
                <span className="text-xs font-bold text-[#f3f4f6]">Hit Sound Preset</span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'switch', label: 'Switch Click' },
                      { id: 'rimshot', label: 'Soft Rimshot' },
                      { id: 'harmonic', label: 'Song Key' },
                    ] as { id: HitSfxMode; label: string }[]
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectHitSfx(preset.id)}
                      className={`clip-chamfer-sm px-3 py-1.5 text-xs font-bold cursor-pointer ${
                        profile.hitSfxMode === preset.id
                          ? 'bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                          : 'bg-[#0c1017] text-[#9ca3af] hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 5: DISPLAY, CHROMEBOOK FX & DEV */}
          {activeTab === 'disp' && (
            <>
              <div className="border-b border-[#1e2533] pb-1.5 text-[11px] font-bold tracking-widest uppercase text-[#6b7280]">
                Chassis Accent &amp; Performance
              </div>

              <div className="clip-chamfer-sm bg-[#141923] p-3 flex flex-col gap-2">
                <div>
                  <div className="text-xs font-bold text-[#f3f4f6]">Dial Lighting Palette</div>
                  <div className="text-[11px] text-[#9ca3af]">Synthwave &amp; Crimson skins unlock in the Orb Vault</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(CHASSIS_THEMES) as ThemeId[]).map((tid) => {
                    const themeCfg = CHASSIS_THEMES[tid];
                    const unlocked = profile.devUnlocked || profile.unlockedThemes.includes(tid);
                    return (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => {
                          if (!unlocked) {
                            onOpenOrbVault();
                            return;
                          }
                          onSelectTheme(tid);
                        }}
                        className={`clip-chamfer-sm flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold uppercase cursor-pointer ${
                          profile.theme === tid
                            ? 'bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                            : unlocked
                            ? 'bg-[#0c1017] text-[#f3f4f6] hover:bg-[#1a2232]'
                            : 'bg-[#0c1017] text-[#6b7280] hover:text-[#fbbf24]'
                        }`}
                      >
                        {!unlocked && <Lock className="h-3 w-3 text-[#fbbf24]" />}
                        <span>{themeCfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="clip-chamfer-sm flex items-center justify-between gap-3 bg-[#141923] p-3">
                <div>
                  <div className="text-xs font-bold text-[#f3f4f6]">Dynamic Background FX</div>
                  <div className="text-[11px] text-[#9ca3af]">Switch to Minimal for ultra-low-end Chromebooks</div>
                </div>
                <div className="flex gap-1">
                  {(['dynamic', 'minimal'] as BgFxMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onSelectBgFx(mode)}
                      className={`clip-chamfer-sm px-2.5 py-1.5 text-[11px] font-bold uppercase cursor-pointer ${
                        profile.bgFxMode === mode
                          ? 'bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                          : 'bg-[#0c1017] text-[#9ca3af]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-b border-[#1e2533] pb-1.5 text-[11px] font-bold tracking-widest uppercase text-[#6b7280]">
                Developer Override
              </div>

              <div className="clip-chamfer-md bg-[#0e131c] ring-1 ring-[#2b3446] p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#f3f4f6]">Dev Access Code</span>
                  <span
                    className={`tabular-nums text-[11px] font-bold ${
                      profile.devUnlocked ? 'text-[#34d399]' : 'text-[#6b7280]'
                    }`}
                  >
                    {profile.devUnlocked ? 'UNLOCKED' : 'LOCKED'}
                  </span>
                </div>
                <p className="text-[11px] text-[#9ca3af]">
                  Unlocks all tracks, difficulty tiers, retro skins, and mod cartridges for testing.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={devInput}
                    onChange={(e) => setDevInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleDevSubmit();
                    }}
                    placeholder="Enter dev code..."
                    aria-label="Developer Access Code"
                    className="clip-chamfer-sm flex-1 bg-[#07090d] px-2.5 py-1.5 font-mono text-xs text-[#f3f4f6] outline-none ring-1 ring-[#2b3446] focus:ring-[var(--theme-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleDevSubmit}
                    className="clip-chamfer-sm bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-extrabold text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] cursor-pointer"
                  >
                    Unlock
                  </button>
                </div>
                {devError && <p className="text-[11px] font-semibold text-[#ef4444]">{devError}</p>}
              </div>

              <div className="border-b border-[#1e2533] pb-1.5 text-[11px] font-bold tracking-widest uppercase text-[#6b7280]">
                Career &amp; Reset
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmCareerReset) {
                      setConfirmCareerReset(true);
                      return;
                    }
                    setConfirmCareerReset(false);
                    onResetCareer();
                  }}
                  className="clip-chamfer-sm bg-[#1f0b0e] px-3 py-1.5 text-xs font-bold text-[#ef4444] hover:bg-[#311116] cursor-pointer"
                >
                  {confirmCareerReset ? 'Click Again to Confirm' : 'Reset Career Stats'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCareerReset(false);
                    onResetDefaults();
                  }}
                  className="clip-chamfer-sm bg-[#141923] px-3 py-1.5 text-xs font-semibold text-[#f3f4f6] hover:bg-[#1e2636] cursor-pointer"
                >
                  Restore Defaults
                </button>
              </div>
            </>
          )}

          {/* TAB 6: FIELD INDEX (15 MODES SANDBOX, MODS, TIERS) */}
          {activeTab === 'index' && (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'modes', label: '15 Wave Modes' },
                    { id: 'mods', label: 'Mods' },
                    { id: 'tiers', label: 'Tiers' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCodexTab(t.id)}
                    className={`clip-chamfer-sm py-1.5 text-[11px] font-extrabold cursor-pointer ${
                      codexTab === t.id
                        ? 'bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                        : 'bg-[#141923] text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {codexTab === 'modes' &&
                  WAVE_MODES.map((m, idx) => (
                    <div
                      key={m.id}
                      className="clip-chamfer-sm bg-[#141923] p-3 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="tabular-nums text-xs font-extrabold" style={{ color: m.color }}>
                          {String(idx + 1).padStart(2, '0')} · {m.name} · {m.tag}
                        </span>
                        <button
                          type="button"
                          onClick={() => onTestWaveSandbox(m.id)}
                          className="clip-chamfer-sm bg-[var(--theme-primary)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] cursor-pointer whitespace-nowrap"
                        >
                          Test Wave
                        </button>
                      </div>
                      <p className="text-xs text-[#9ca3af]">{m.desc}</p>
                    </div>
                  ))}

                {codexTab === 'mods' &&
                  MOD_CATALOG.map((mod) => (
                    <div
                      key={mod.code}
                      className="clip-chamfer-sm bg-[#141923] p-3 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-xs font-extrabold tabular-nums">
                        <span className="text-[#f3f4f6]">
                          [{mod.code}] {mod.name}
                        </span>
                        <span className="text-[var(--theme-bright)]">{mod.mult.toFixed(2)}x</span>
                      </div>
                      <p className="text-xs text-[#9ca3af]">{mod.desc}</p>
                    </div>
                  ))}

                {codexTab === 'tiers' &&
                  DIFFICULTY_ORDER.map((diffId) => {
                    const d = DIFFICULTIES[diffId];
                    const unlocked = profile.devUnlocked || profile.unlockedDiffs.includes(diffId);
                    return (
                      <div
                        key={diffId}
                        className="clip-chamfer-sm bg-[#141923] p-3 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between text-xs font-extrabold tabular-nums">
                          <span className="text-[#f3f4f6]">
                            {d.name} ({unlocked ? 'Unlocked' : `${d.orbCost} Orbs`})
                          </span>
                          <span className="text-[var(--theme-bright)]">{d.mult.toFixed(2)}x</span>
                        </div>
                        <p className="text-xs text-[#9ca3af]">{d.desc}</p>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Vertical Right-Edge Side Rail */}
      <nav className="flex flex-col items-center gap-1.5 bg-[#06080c] px-1 py-3" aria-label="Pause Menu Tabs">
        {(
          [
            { id: 'main', label: 'STATS', Icon: BarChart3 },
            { id: 'tracks', label: 'TRACKS', Icon: ListMusic },
            { id: 'ctrl', label: 'CTRL', Icon: Gamepad2 },
            { id: 'audio', label: 'AUDIO', Icon: Volume2 },
            { id: 'disp', label: 'SET', Icon: Settings },
            { id: 'index', label: 'INDEX', Icon: BookOpen },
          ] as { id: PauseTabId; label: string; Icon: React.ComponentType<{ className?: string }> }[]
        ).map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChangeTab(id)}
              aria-selected={active}
              className={`clip-chamfer-sm relative flex w-12 flex-col items-center justify-center gap-1 py-2.5 transition-colors cursor-pointer ${
                active
                  ? 'bg-[var(--theme-dim)] text-[var(--theme-bright)]'
                  : 'text-[#6b7280] hover:bg-[#141923] hover:text-[#f3f4f6]'
              }`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-1.5 bottom-1.5 w-[2px] bg-[var(--theme-bright)]"
                />
              )}
              <Icon className="h-4 w-4" />
              <span className="text-[9px] font-extrabold tracking-wider">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
