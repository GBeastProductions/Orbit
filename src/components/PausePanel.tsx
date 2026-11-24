import React, { useRef, useState } from 'react';
import {
  Coins,
  ExternalLink,
  Home,
  Lock,
  Play,
  Upload,
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

const TAB_ITEMS: { id: PauseTabId; label: string; heading: string }[] = [
  { id: 'main', label: 'STATS', heading: 'Performance Telemetry' },
  { id: 'tracks', label: 'TRACKS', heading: 'Beatmap Ledger' },
  { id: 'ctrl', label: 'CONTROLS', heading: 'Input & Calibration' },
  { id: 'audio', label: 'AUDIO', heading: 'Audio & Hit Synth' },
  { id: 'disp', label: 'DISPLAY', heading: 'Chassis & System' },
  { id: 'index', label: 'INDEX', heading: 'Wave Schematics' },
];

/**
 * Custom 54x54 SVG technical schematic illustrating each of the 15 WaveModeId mechanics.
 */
const WaveModeSchematic: React.FC<{ modeId: WaveModeId; color: string }> = ({ modeId, color }) => {
  const cx = 27;
  const cy = 27;
  const r = 18;

  return (
    <svg
      width={54}
      height={54}
      viewBox="0 0 54 54"
      aria-hidden="true"
      className="shrink-0 bg-[#05070b] border border-[#1d2534]"
    >
      {/* Subtle blueprint crosshair */}
      <line x1={cx} y1={4} x2={cx} y2={50} stroke="#141a25" strokeWidth={1} />
      <line x1={4} y1={cy} x2={50} y2={cy} stroke="#141a25" strokeWidth={1} />
      {/* Base orbit track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2738" strokeWidth={3} />

      {modeId === 'CW_GREEN' && (
        <>
          <path d="M 27 9 A 18 18 0 0 1 45 27" fill="none" stroke={color} strokeWidth={5} strokeLinecap="butt" />
          <path d="M 38.5 14 L 40.5 16.2" stroke="#ffffff" strokeWidth={2} />
          {/* CW center arrow */}
          <path d="M 22 24 A 6 6 0 1 1 31 31" fill="none" stroke={color} strokeWidth={1.6} />
          <polygon points="31,33 33.5,29 28.5,29.5" fill={color} />
        </>
      )}

      {modeId === 'CCW_RED' && (
        <>
          <path d="M 27 9 A 18 18 0 0 0 9 27" fill="none" stroke={color} strokeWidth={5} />
          <path d="M 15.5 14 L 13.5 16.2" stroke="#ffffff" strokeWidth={2} />
          {/* CCW center arrow */}
          <path d="M 32 24 A 6 6 0 1 0 23 31" fill="none" stroke={color} strokeWidth={1.6} />
          <polygon points="23,33 20.5,29 25.5,29.5" fill={color} />
        </>
      )}

      {modeId === 'DOUBLE_TAP' && (
        <>
          <path d="M 27 9 A 18 18 0 0 1 45 27" fill="none" stroke={color} strokeWidth={5} />
          <circle cx={cx} cy={cy} r={11} fill="#081622" stroke={color} strokeWidth={1} />
          <text
            x={cx}
            y={cy + 3.5}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="10"
            fontWeight="900"
            fontFamily="monospace"
          >
            2×
          </text>
        </>
      )}

      {modeId === 'PURPLE_SURGE' && (
        <>
          <path d="M 27 9 A 18 18 0 0 1 44 21" fill="none" stroke={color} strokeWidth={5} />
          {/* Double speed chevrons */}
          <polyline points="20,23 25,27 20,31" fill="none" stroke={color} strokeWidth={2} />
          <polyline points="27,23 32,27 27,31" fill="none" stroke="#e9d5ff" strokeWidth={2} />
        </>
      )}

      {modeId === 'ONE_PASS' && (
        <>
          <path d="M 32 10 A 18 18 0 0 1 44 24" fill="none" stroke={color} strokeWidth={5} />
          {/* Strict barrier line at trailing edge */}
          <line x1={38} y1={24} x2={50} y2={24} stroke="#ef4444" strokeWidth={2} />
          <line x1={cx} y1={cy} x2={41} y2={14} stroke="#ffffff" strokeWidth={1.5} />
          <circle cx={cx} cy={cy} r={2.5} fill={color} />
        </>
      )}

      {modeId === 'SNIPER_MICRO' && (
        <>
          <path d="M 33 10.5 A 18 18 0 0 1 39 14" fill="none" stroke={color} strokeWidth={6} />
          <line x1={37} y1={5} x2={34.5} y2={10} stroke="#ffffff" strokeWidth={1.2} />
          <line x1={43} y1={10} x2={38} y2={13.5} stroke="#ffffff" strokeWidth={1.2} />
          <circle cx={cx} cy={cy} r={5} fill="none" stroke={color} strokeWidth={1} strokeDasharray="2 2" />
          <circle cx={cx} cy={cy} r={1.8} fill="#ffffff" />
        </>
      )}

      {modeId === 'MULTI_CLUSTER' && (
        <>
          <path d="M 27 9 A 18 18 0 0 1 40 15" fill="none" stroke={color} strokeWidth={5} />
          <path d="M 43 35 A 18 18 0 0 1 28 45" fill="none" stroke={color} strokeWidth={5} />
          <circle cx={cx} cy={cy} r={3} fill={color} />
        </>
      )}

      {modeId === 'ORDERED_SEQ' && (
        <>
          <path d="M 27 9 A 18 18 0 0 1 37 12" fill="none" stroke={color} strokeWidth={4.5} />
          <path d="M 45 26 A 18 18 0 0 1 41 38" fill="none" stroke="#9ca3af" strokeWidth={4.5} />
          <path d="M 26 45 A 18 18 0 0 1 14 40" fill="none" stroke="#64748b" strokeWidth={4.5} />
          <text x={36} y={9} fill={color} fontSize="7.5" fontWeight="900" fontFamily="monospace">1</text>
          <text x={46} y={37} fill="#d1d5db" fontSize="7.5" fontWeight="900" fontFamily="monospace">2</text>
          <text x={12} y={48} fill="#9ca3af" fontSize="7.5" fontWeight="900" fontFamily="monospace">3</text>
        </>
      )}

      {modeId === 'CASCADE_CHAIN' && (
        <>
          <path d="M 22 10 A 18 18 0 0 1 34 11" fill="none" stroke={color} strokeWidth={5} />
          <path d="M 38 14 A 18 18 0 0 1 44 25" fill="none" stroke={color} strokeWidth={5} opacity={0.48} />
          <path d="M 33 15 L 39 19" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="2 1.5" />
          <circle cx={cx} cy={cy} r={2.2} fill={color} />
        </>
      )}

      {modeId === 'DECAY_ARC' && (
        <>
          <path d="M 16 13 A 18 18 0 0 1 38 13" fill="none" stroke={color} strokeWidth={5} opacity={0.35} />
          <path d="M 22 10 A 18 18 0 0 1 32 10" fill="none" stroke={color} strokeWidth={5} />
          {/* Inward compression arrows */}
          <polyline points="16,8 20,10 17,13" fill="none" stroke="#ffffff" strokeWidth={1.3} />
          <polyline points="38,8 34,10 37,13" fill="none" stroke="#ffffff" strokeWidth={1.3} />
        </>
      )}

      {modeId === 'HAZARD_DECOY' && (
        <>
          <path d="M 23 9.5 A 18 18 0 0 1 31 9.5" fill="none" stroke="#10b981" strokeWidth={5} />
          {/* Flanking red mines */}
          <circle cx={14} cy={15} r={3.2} fill="#ef4444" />
          <circle cx={40} cy={15} r={3.2} fill="#ef4444" />
          <path d="M 12.5 13.5 L 15.5 16.5 M 15.5 13.5 L 12.5 16.5" stroke="#ffffff" strokeWidth={1} />
          <path d="M 38.5 13.5 L 41.5 16.5 M 41.5 13.5 L 38.5 16.5" stroke="#ffffff" strokeWidth={1} />
        </>
      )}

      {modeId === 'GHOST_PULSE' && (
        <>
          <path
            d="M 27 9 A 18 18 0 0 1 45 27"
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeDasharray="3.5 3.5"
            opacity={0.65}
          />
          <line x1={cx} y1={cy} x2={34} y2={11} stroke="#ffffff" strokeWidth={1.6} />
          <circle cx={cx} cy={cy} r={2.5} fill={color} />
        </>
      )}

      {modeId === 'SPRING_BOUNCE' && (
        <>
          <path d="M 22 10 A 18 18 0 0 1 32 10" fill="none" stroke={color} strokeWidth={5} />
          {/* Left-right oscillation arrows */}
          <path d="M 15 17 L 11 19 L 15 21" fill="none" stroke={color} strokeWidth={1.5} />
          <path d="M 39 17 L 43 19 L 39 21" fill="none" stroke={color} strokeWidth={1.5} />
          <line x1={12} y1={19} x2={42} y2={19} stroke={color} strokeWidth={1} strokeDasharray="2 2" opacity={0.65} />
        </>
      )}

      {modeId === 'BRAKE_DRIFT' && (
        <>
          <path d="M 31 9.5 A 18 18 0 0 1 44 22" fill="none" stroke={color} strokeWidth={5} />
          {/* Velocity curve inside center */}
          <path d="M 15 34 Q 27 34 32 24 T 40 20" fill="none" stroke={color} strokeWidth={1.8} />
          <circle cx={32} cy={24} r={2} fill="#ffffff" />
        </>
      )}

      {modeId === 'OSU_PORTAL' && (
        <>
          {/* Warp chord across dial */}
          <line x1={15} y1={14} x2={39} y2={40} stroke={color} strokeWidth={1.4} strokeDasharray="3 2.5" />
          <circle cx={15} cy={14} r={3.5} fill="#05070b" stroke="#38bdf8" strokeWidth={2} />
          <circle cx={39} cy={40} r={3.5} fill="#05070b" stroke={color} strokeWidth={2} />
          <path d="M 31 44 A 18 18 0 0 1 20 43" fill="none" stroke="#34d399" strokeWidth={4.5} />
        </>
      )}
    </svg>
  );
};

export const PausePanel: React.FC<PausePanelProps> = React.memo(
  ({
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

    const activeTabMeta = TAB_ITEMS.find((t) => t.id === activeTab) || TAB_ITEMS[0];
    const activeSong = songs.find((s) => s.id === profile.selectedSongId) || songs[0];
    const activeDiff = DIFFICULTIES[profile.selectedDifficulty] || DIFFICULTIES.CHILL;

    const totalAttempts = profile.totalHits + profile.totalMisses;
    const accuracyPct = totalAttempts > 0 ? ((profile.totalHits / totalAttempts) * 100).toFixed(1) : '100.0';
    const perfectPct = totalAttempts > 0 ? ((profile.totalPerfects / totalAttempts) * 100).toFixed(1) : '0.0';
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
        aria-hidden={!open}
        className={`fixed top-0 right-0 bottom-0 z-50 flex w-[min(96vw,600px)] flex-col border-l border-[#232b3b] bg-[#07090e] transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {open && (
          <>
            {/* Top Engineering Console Header */}
            <header className="relative flex items-center justify-between gap-3 border-b border-[#1c2433] bg-[#0a0d14] px-5 py-4">
              <span
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--theme-primary)]"
              />

              <div className="min-w-0">
                <p className="tabular-nums text-[10px] font-extrabold tracking-[0.22em] uppercase text-[var(--theme-bright)]">
                  {mustChooseTrack ? 'Select Next Track' : 'Orbit Console · Rev 2.0'}
                </p>
                <h2
                  id="pausePanelHeading"
                  className="font-display text-lg font-black uppercase tracking-wider text-white truncate"
                >
                  {activeTabMeta.heading}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onGoToTitle}
                  title="Return to Title Menu"
                  className="border border-[#252e3f] bg-[#0f141e] p-2 text-[#9ca3af] hover:border-[var(--theme-primary)] hover:text-white transition-colors cursor-pointer"
                >
                  <Home className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onOpenOrbVault}
                  className="flex items-center gap-1.5 border border-[#4f390a] bg-[#1a1204] px-2.5 py-1.5 text-[11px] font-extrabold text-[#fbbf24] hover:border-[#fbbf24] cursor-pointer tabular-nums whitespace-nowrap"
                >
                  <Coins className="h-3 w-3" />
                  <span>{profile.orbs}</span>
                </button>
                <button
                  type="button"
                  onClick={onResume}
                  className="bg-[var(--theme-primary)] px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] transition-colors cursor-pointer whitespace-nowrap"
                >
                  {mustChooseTrack ? 'Pick Track' : 'Close'}
                </button>
              </div>
            </header>

            {/* Clean Horizontal Underline Tab Strip */}
            <nav
              aria-label="Console Sections"
              className="flex items-stretch overflow-x-auto border-b border-[#1c2433] bg-[#090c12] px-3"
            >
              {TAB_ITEMS.map((t) => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChangeTab(t.id)}
                    aria-selected={active}
                    className={`relative shrink-0 px-3 py-3 text-[11px] font-extrabold tracking-[0.15em] uppercase transition-colors cursor-pointer ${
                      active ? 'text-[var(--theme-bright)]' : 'text-[#6b7280] hover:text-[#e5e7eb]'
                    }`}
                  >
                    {t.label}
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-2 right-2 h-[2px] bg-[var(--theme-bright)]"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Scrollable Ledger Body */}
            <div className="orbit-scroll flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
              {/* TAB 1: STATS */}
              {activeTab === 'main' && (
                <>
                  {/* Monumental Unboxed Hero Numerals */}
                  <div className="grid grid-cols-3 divide-x divide-[#1c2433] border-b border-[#1c2433] pb-5 tabular-nums">
                    <div className="pr-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b7280]">
                        Hit Accuracy
                      </div>
                      <div className="font-display mt-1 text-3xl sm:text-4xl font-black text-[var(--theme-bright)]">
                        {accuracyPct}%
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#9ca3af]">Lifetime Avg</div>
                    </div>

                    <div className="px-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b7280]">
                        Best Score
                      </div>
                      <div className="font-display mt-1 text-3xl sm:text-4xl font-black text-white">
                        {profile.bestScore.toLocaleString()}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#9ca3af]">
                        {activeDiff.name}: {(profile.tierBestScores[activeDiff.id] || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="pl-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b7280]">
                        Orb Vault
                      </div>
                      <div className="font-display mt-1 text-3xl sm:text-4xl font-black text-[#fde047]">
                        {profile.orbs.toLocaleString()}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#fbbf24]">
                        {profile.totalOrbsEarned} Total Earned
                      </div>
                    </div>
                  </div>

                  {/* Secondary Hairline Precision Ledger */}
                  <div className="grid grid-cols-3 divide-x divide-[#1c2433] border-b border-[#1c2433] pb-5 tabular-nums">
                    <div className="pr-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                        Hit / Miss Ratio
                      </div>
                      <div className="mt-1 text-xl font-extrabold text-white">{cmRatio}</div>
                      <div className="text-[11px] text-[#9ca3af]">
                        {profile.totalHits}H · {profile.totalMisses}M
                      </div>
                    </div>

                    <div className="px-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                        Perfect Rate
                      </div>
                      <div className="mt-1 text-xl font-extrabold text-white">{perfectPct}%</div>
                      <div className="text-[11px] text-[#9ca3af]">{profile.totalPerfects} Bullseyes</div>
                    </div>

                    <div className="pl-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                        Center Offset
                      </div>
                      <div className="mt-1 text-xl font-extrabold text-white">{avgOffset}°</div>
                      <div className="text-[11px] text-[#9ca3af]">Peak {profile.bestStreak}× Streak</div>
                    </div>
                  </div>

                  {/* Zero-Centered Early / Late Miss Balance Gauge */}
                  <div className="border-b border-[#1c2433] pb-5 tabular-nums">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                      <span className="text-[#38bdf8]">Early Misses · {profile.earlyMisses} ({earlyPct}%)</span>
                      <span className="text-[#6b7280]">Timing Bias</span>
                      <span className="text-[#f87171]">Late · {profile.lateMisses} ({100 - earlyPct}%)</span>
                    </div>
                    <div className="relative h-2.5 w-full bg-[#121722]">
                      <div
                        className="h-full bg-[var(--theme-primary)] transition-[width] duration-200"
                        style={{ width: `${earlyPct}%` }}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute top-[-3px] bottom-[-3px] left-1/2 w-[2px] -translate-x-1/2 bg-white/75"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={onGoToSongSelect}
                      className="flex-1 border border-[#2b3446] bg-[#0e131d] py-2.5 text-xs font-extrabold uppercase tracking-[0.16em] text-white hover:border-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-[var(--theme-on-primary)] transition-colors cursor-pointer"
                    >
                      Open Track Select
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeTab('index')}
                      className="flex-1 border border-[#2b3446] bg-[#0e131d] py-2.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#d1d5db] hover:border-white hover:text-white transition-colors cursor-pointer"
                    >
                      Inspect 15 Wave Modes
                    </button>
                  </div>
                </>
              )}

              {/* TAB 2: TRACKS + NEWGROUNDS ID */}
              {activeTab === 'tracks' && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2433] pb-3.5">
                    <span className="text-xs text-[#9ca3af]">
                      Need custom level art, Dim, or Blur sliders?
                    </span>
                    <button
                      type="button"
                      onClick={onGoToSongSelect}
                      className="border border-[var(--theme-primary)]/70 bg-[var(--theme-dim)] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[var(--theme-bright)] hover:bg-[var(--theme-primary)] hover:text-[var(--theme-on-primary)] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Open Track Select
                    </button>
                  </div>

                  {/* Newgrounds Lookup & MP3 Import Strip */}
                  <div className="border-b border-[#1c2433] pb-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9ca3af]">
                      <span>Newgrounds ID &amp; Local MP3 Import</span>
                      <span className="text-[var(--theme-bright)]">1.0x Pure Sync</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ngInput}
                        onChange={(e) => setNgInput(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Enter Newgrounds ID (e.g. 587069)"
                        className="flex-1 border border-[#242d3e] bg-[#04060a] px-3 py-2 font-mono text-xs text-white outline-none focus:border-[var(--theme-primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => onLookupNewgroundsId(ngInput)}
                        className="bg-[var(--theme-primary)] px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] cursor-pointer whitespace-nowrap"
                      >
                        Lookup
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
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
                        className="flex items-center gap-1.5 border border-[#242d3e] bg-[#0c1018] px-3 py-1.5 text-xs font-bold text-[#e5e7eb] hover:border-[var(--theme-primary)] cursor-pointer"
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

                  {/* Ledger Track List */}
                  <div className="divide-y divide-[#18202e]">
                    {songs.map((song) => {
                      const isCurrent = profile.selectedSongId === song.id;
                      const songUnlocked = profile.devUnlocked || profile.unlockedSongs.includes(song.id);
                      const rec = profile.songRecords[song.id];
                      const tiers = song.chillOnly ? (['CHILL'] as DifficultyId[]) : DIFFICULTY_ORDER;

                      return (
                        <div
                          key={song.id}
                          className={`py-3.5 pl-3 border-l-2 transition-colors ${
                            isCurrent ? 'border-[var(--theme-bright)] bg-[#0b1714]/55' : 'border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-[#6b7280] tabular-nums">
                            <span>
                              #{song.num} · NG #{song.newgroundsId} · {song.bpm} BPM · {formatTimeSec(song.durationSec)}
                            </span>
                            <span className="text-[#d1d5db]">
                              {!songUnlocked
                                ? `${song.orbCost} Orbs`
                                : rec
                                ? `${rec.bestRank} · ${rec.bestScore.toLocaleString()}`
                                : 'Unplayed'}
                            </span>
                          </div>

                          <div className="mt-0.5 flex items-baseline justify-between gap-2">
                            <h3 className="font-display text-sm font-extrabold text-white">
                              {song.title} <span className="text-xs font-normal text-[#9ca3af]">— {song.artist}</span>
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-bright)]">
                              {song.keySig}
                            </span>
                          </div>

                          <div className="mt-2.5 flex flex-wrap gap-1.5 tabular-nums">
                            {!songUnlocked ? (
                              <button
                                type="button"
                                onClick={onOpenOrbVault}
                                className="flex items-center gap-1 border border-[#4a3408] bg-[#1a1204] px-2.5 py-1 text-[11px] font-bold text-[#fbbf24] hover:border-[#fbbf24] cursor-pointer"
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
                                    className={`border px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                                      selected
                                        ? 'border-[var(--theme-bright)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                                        : unlocked
                                        ? 'border-[#232b3b] bg-[#0b0f17] text-[#e5e7eb] hover:border-[var(--theme-primary)]'
                                        : 'border-[#1d2432] bg-[#080b11] text-[#6b7280] hover:text-[#fbbf24]'
                                    }`}
                                  >
                                    {diffId} {star} {!unlocked ? `(${DIFFICULTIES[diffId].orbCost})` : ''}
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
                <div className="divide-y divide-[#18202e]">
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-white">Primary Trigger</div>
                      <div className="text-[11px] text-[#9ca3af]">Main hit keybind (Default Spacebar)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartRebind(1)}
                      className={`min-w-[96px] border px-3.5 py-1.5 text-xs font-extrabold tabular-nums cursor-pointer ${
                        listeningSlot === 1
                          ? 'border-[#fbbf24] bg-[#f59e0b] text-black'
                          : 'border-[#2d3648] bg-[#0d111a] text-white hover:border-[var(--theme-primary)]'
                      }`}
                    >
                      {listeningSlot === 1 ? 'PRESS KEY...' : profile.trigger1Label}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-white">Secondary Trigger</div>
                      <div className="text-[11px] text-[#9ca3af]">Alternate key for fast alternating streams</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartRebind(2)}
                      className={`min-w-[96px] border px-3.5 py-1.5 text-xs font-extrabold tabular-nums cursor-pointer ${
                        listeningSlot === 2
                          ? 'border-[#fbbf24] bg-[#f59e0b] text-black'
                          : 'border-[#2d3648] bg-[#0d111a] text-white hover:border-[var(--theme-primary)]'
                      }`}
                    >
                      {listeningSlot === 2 ? 'PRESS KEY...' : profile.trigger2Label}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-white">Mouse / Touch Ring Tap</div>
                      <div className="text-[11px] text-[#9ca3af]">Click or tap anywhere on the calibration dial</div>
                    </div>
                    <ArcadeSwitch checked={profile.allowPointerTap} onToggle={onTogglePointer} />
                  </div>

                  <div className="py-4 flex flex-col gap-2.5 tabular-nums">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="uppercase tracking-wide text-white">Audio Latency Calibration</span>
                      <span className="text-[var(--theme-bright)] font-black">
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
                      Nudge positive (+) for Bluetooth latency or negative (-) if visual sectors feel behind the beat.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-white">Tutorial Calibration Guide</div>
                      <div className="text-[11px] text-[#9ca3af]">Replay Moments Passing Us with dial slow-mo cues</div>
                    </div>
                    <button
                      type="button"
                      onClick={onReplayTutorial}
                      className="bg-[var(--theme-primary)] px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] cursor-pointer whitespace-nowrap"
                    >
                      Start Guide
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: AUDIO & SFX */}
              {activeTab === 'audio' && (
                <div className="divide-y divide-[#18202e]">
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-white">Music Engine (Pure 1.0x)</div>
                      <div className="text-[11px] text-[#9ca3af]">
                        Active Disc #{activeSong.num} · {activeSong.title}
                      </div>
                    </div>
                    <ArcadeSwitch checked={profile.musicEnabled} onToggle={onToggleMusic} />
                  </div>

                  <div className="py-4 flex flex-col gap-2 tabular-nums">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="uppercase tracking-wide text-[#d1d5db]">Music Gain</span>
                      <span className="text-[var(--theme-bright)]">{profile.musicVolume}%</span>
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

                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-white">Tactile Hit &amp; Cue SFX</div>
                      <div className="text-[11px] text-[#9ca3af]">Zero-latency Web Audio synthesis</div>
                    </div>
                    <ArcadeSwitch checked={profile.soundEnabled} onToggle={onToggleSound} />
                  </div>

                  <div className="py-4 flex flex-col gap-2 tabular-nums">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="uppercase tracking-wide text-[#d1d5db]">SFX Gain</span>
                      <span className="text-[var(--theme-bright)]">{profile.sfxVolume}%</span>
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

                  <div className="py-4 flex flex-col gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-white">Hit Sound Profile</span>
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
                          className={`border px-3.5 py-1.5 text-xs font-bold cursor-pointer ${
                            profile.hitSfxMode === preset.id
                              ? 'border-[var(--theme-bright)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                              : 'border-[#252e3f] bg-[#0c1018] text-[#9ca3af] hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: DISPLAY & SYSTEM */}
              {activeTab === 'disp' && (
                <div className="divide-y divide-[#18202e]">
                  <div className="py-3.5 flex flex-col gap-2.5">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-white">Dial Chassis Lighting</div>
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
                            className={`flex items-center gap-1.5 border px-3 py-1.5 text-[11px] font-bold uppercase cursor-pointer ${
                              profile.theme === tid
                                ? 'border-[var(--theme-bright)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                                : unlocked
                                ? 'border-[#252e3f] bg-[#0c1018] text-[#e5e7eb] hover:border-[#4b5563]'
                                : 'border-[#1b2230] bg-[#080b11] text-[#6b7280] hover:text-[#fbbf24]'
                            }`}
                          >
                            {!unlocked && <Lock className="h-3 w-3 text-[#fbbf24]" />}
                            <span>{themeCfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-white">Background FX Mode</div>
                      <div className="text-[11px] text-[#9ca3af]">Use Minimal on low-power school Chromebooks</div>
                    </div>
                    <div className="flex gap-1.5">
                      {(['dynamic', 'minimal'] as BgFxMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onSelectBgFx(mode)}
                          className={`border px-3 py-1.5 text-[11px] font-bold uppercase cursor-pointer ${
                            profile.bgFxMode === mode
                              ? 'border-[var(--theme-bright)] bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                              : 'border-[#252e3f] bg-[#0c1018] text-[#9ca3af] hover:text-white'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="py-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-white">Developer Override</span>
                      <span
                        className={`tabular-nums text-[11px] font-black ${
                          profile.devUnlocked ? 'text-[#34d399]' : 'text-[#6b7280]'
                        }`}
                      >
                        {profile.devUnlocked ? 'ACTIVE' : 'LOCKED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9ca3af]">
                      Unlocks all tracks, tiers, chassis themes, and mod cartridges for testing.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={devInput}
                        onChange={(e) => setDevInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleDevSubmit();
                        }}
                        placeholder="Enter access code..."
                        aria-label="Developer Access Code"
                        className="flex-1 border border-[#242d3e] bg-[#04060a] px-3 py-1.5 font-mono text-xs text-white outline-none focus:border-[var(--theme-primary)]"
                      />
                      <button
                        type="button"
                        onClick={handleDevSubmit}
                        className="bg-[var(--theme-primary)] px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--theme-on-primary)] hover:bg-[var(--theme-bright)] cursor-pointer"
                      >
                        Unlock
                      </button>
                    </div>
                    {devError && <p className="text-[11px] font-semibold text-[#ef4444]">{devError}</p>}
                  </div>

                  <div className="py-4 flex flex-wrap items-center justify-between gap-2">
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
                      className="border border-[#4c161d] bg-[#19090b] px-3.5 py-2 text-xs font-bold text-[#ef4444] hover:border-[#ef4444] cursor-pointer"
                    >
                      {confirmCareerReset ? 'Confirm Reset Career?' : 'Reset Career Stats'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmCareerReset(false);
                        onResetDefaults();
                      }}
                      className="border border-[#252e3f] bg-[#0c1018] px-3.5 py-2 text-xs font-semibold text-[#d1d5db] hover:border-white hover:text-white cursor-pointer"
                    >
                      Restore Defaults
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 6: WAVE SCHEMATICS INDEX (15 MODES SANDBOX, MODS, TIERS) */}
              {activeTab === 'index' && (
                <>
                  <div className="flex border-b border-[#1c2433] pb-3 gap-2">
                    {(
                      [
                        { id: 'modes', label: '15 Wave Schematics' },
                        { id: 'mods', label: 'Mod Cartridges' },
                        { id: 'tiers', label: 'Subdivision Tiers' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCodexTab(t.id)}
                        className={`border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider cursor-pointer ${
                          codexTab === t.id
                            ? 'border-[var(--theme-bright)] bg-[var(--theme-dim)] text-[var(--theme-bright)]'
                            : 'border-[#1f2736] bg-transparent text-[#6b7280] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="divide-y divide-[#18202e]">
                    {codexTab === 'modes' &&
                      WAVE_MODES.map((m, idx) => (
                        <div key={m.id} className="flex items-center gap-3.5 py-3">
                          <WaveModeSchematic modeId={m.id} color={m.color} />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 tabular-nums">
                              <span className="text-[10px] font-black text-[#6b7280]">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="text-xs font-black tracking-wide uppercase" style={{ color: m.color }}>
                                {m.name}
                              </span>
                              <span className="border border-[#242c3d] px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase text-[#9ca3af]">
                                {m.tag}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-snug text-[#9ca3af]">{m.desc}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => onTestWaveSandbox(m.id)}
                            className="flex shrink-0 items-center gap-1 border border-[#2d3648] bg-[#0e131d] px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white hover:border-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-[var(--theme-on-primary)] transition-colors cursor-pointer"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>Test</span>
                          </button>
                        </div>
                      ))}

                    {codexTab === 'mods' &&
                      MOD_CATALOG.map((mod) => (
                        <div key={mod.code} className="flex items-start justify-between gap-4 py-3.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="border border-[#2b3446] bg-[#0d121c] px-1.5 py-0.5 font-mono text-[10px] font-black text-[var(--theme-bright)]">
                                {mod.code}
                              </span>
                              <span className="text-xs font-extrabold uppercase tracking-wide text-white">
                                {mod.name}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#9ca3af]">{mod.desc}</p>
                          </div>
                          <span className="tabular-nums text-xs font-black text-[var(--theme-bright)] shrink-0">
                            {mod.mult.toFixed(2)}×
                          </span>
                        </div>
                      ))}

                    {codexTab === 'tiers' &&
                      DIFFICULTY_ORDER.map((diffId) => {
                        const d = DIFFICULTIES[diffId];
                        const unlocked = profile.devUnlocked || profile.unlockedDiffs.includes(diffId);
                        return (
                          <div key={diffId} className="flex items-start justify-between gap-4 py-3.5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-white">
                                  {d.name}
                                </span>
                                <span className="text-[10px] font-bold uppercase text-[#9ca3af]">
                                  {unlocked ? '· Unlocked' : `· ${d.orbCost} Orbs`}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-[#9ca3af]">{d.desc}</p>
                            </div>
                            <span className="tabular-nums text-xs font-black text-[var(--theme-bright)] shrink-0">
                              {d.mult.toFixed(2)}×
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </aside>
    );
  },
);
