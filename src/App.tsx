import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from './audio/audioEngine';
import { ZoomWarpTransition } from './components/ArcadeChrome';
import { BackgroundBackdrop } from './components/BackgroundBackdrop';
import { ModDrawer } from './components/ModDrawer';
import { CanvasRenderState, getWaveModeMeta, OrbitStage } from './components/OrbitStage';
import { OrbShopModal } from './components/OrbShopModal';
import { PausePanel } from './components/PausePanel';
import { RunSummaryModal } from './components/RunSummaryModal';
import { SongSelectScreen } from './components/SongSelectScreen';
import { TitleScreen } from './components/TitleScreen';
import { TopBar } from './components/TopBar';
import {
  CHASSIS_THEMES,
  DEV_PASSCODE,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  NEEDLE_TOLERANCE,
  SONG_CATALOG,
  TUTORIAL_LESSONS,
} from './data/catalog';
import {
  buildSongBeatmap,
  computeHitPoints,
  computeLetterRank,
  computeRankOrbBonus,
  computeTotalMultiplier,
  formatTimeSec,
  getSectionAtProgress,
  getStreakMultiplier,
  isCashOutEligible,
  signedAngleDiff,
  wrapAngle,
} from './engine/beatmap';
import { orbitEvents } from './engine/gameEvents';
import { INITIAL_PROFILE, loadProfile, saveProfile } from './store/profileStore';
import {
  BeatmapNote,
  BgFxMode,
  DifficultyId,
  GamePhase,
  HitErrorTick,
  HitSfxMode,
  JudgmentTier,
  LevelBackgroundSetting,
  ModCode,
  PauseTabId,
  PlayerProfile,
  RunSummaryData,
  ScreenView,
  SongDefinition,
  SongSection,
  TargetSector,
  ThemeId,
  TutorialLesson,
  WaveModeId,
} from './types/game';

interface RuntimeEngine {
  phase: GamePhase;
  score: number;
  streak: number;
  maxStreakInRun: number;
  unbankedOrbs: number;
  shields: number;
  spinnerAngle: number;
  direction: 1 | -1;
  baseAngularSpeed: number;
  angularSpeed: number;
  waveModeId: WaveModeId;
  waveIndex: number;
  targets: TargetSector[];
  hazards: { angle: number; halfWidth: number }[];
  portal: {
    entryAngle: number;
    exitAngle: number;
    halfWidth: number;
    warped: boolean;
    warpFlashTimer: number;
  } | null;
  waveElapsed: number;
  songTime: number;
  songSection: SongSection;
  beatmap: BeatmapNote[];
  beatmapIndex: number;
  hitEffects: {
    timer: number;
    duration: number;
    angle: number;
    isPerfect: boolean;
    label: string;
    color: string;
  }[];
  hitErrorTicks: HitErrorTick[];
  hubStatusText: string;
  hubStatusColor: string | null;
  hubStatusTimer: number;
  shakeTime: number;
  shakeAmplitude: number;
  shakeX: number;
  missReason: string;
  missDegrees: string;
  missNearestEdge: number;
  missSignedSpan: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  runOffsetDegSum: number;
  runHitCount: number;
  runOffsetSamples: number[];
  // Tutorial & Cinematic (dial-only slow-mo, song stays 1.0x)
  isTutorialRun: boolean;
  tutorialLives: number;
  shownLessonIds: Set<string>;
  activeLesson: TutorialLesson | null;
  lessonSlowActive: boolean;
  tutorialGuideDisabled: boolean;
  dialTimeScale: number;
  cinematicTimer: number;
  dialVisualAlpha: number;
  dialSpinBoost: number;
  sandboxModeId: WaveModeId | null;
  beatPulse: number;
  activeBeatLed: number;
  // Buffered career telemetry flushed on pause/run-end to prevent mid-song localStorage frame hitches
  pendingHits: number;
  pendingPerfects: number;
  pendingOffsetDegSum: number;
  pendingMisses: number;
  pendingEarlyMisses: number;
  pendingLateMisses: number;
}

function formatKeyLabel(e: KeyboardEvent): string {
  if (e.code === 'Space') return 'SPACE';
  if (e.code.startsWith('Key')) return `KEY ${e.code.slice(3).toUpperCase()}`;
  if (e.code.startsWith('Digit')) return e.code.slice(5);
  if (e.code.startsWith('Arrow')) return e.code.slice(5).toUpperCase();
  return e.code.toUpperCase();
}

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [songs, setSongs] = useState<SongDefinition[]>(() => [...SONG_CATALOG]);
  const [screen, setScreen] = useState<ScreenView>('TITLE');
  const [customAudioStatus, setCustomAudioStatus] = useState('');

  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseTab, setPauseTab] = useState<PauseTabId>('main');
  const [modsOpen, setModsOpen] = useState(false);
  const [orbShopOpen, setOrbShopOpen] = useState(false);
  const [mustChooseTrack, setMustChooseTrack] = useState(false);
  const [listeningSlot, setListeningSlot] = useState<0 | 1 | 2>(0);
  const [summaryData, setSummaryData] = useState<RunSummaryData | null>(null);
  const [showTutorialCompleteStripe, setShowTutorialCompleteStripe] = useState(false);
  const [warpLaunchLabel, setWarpLaunchLabel] = useState<string | null>(null);
  const warpTimersRef = useRef<number[]>([]);

  // React UI state synced cleanly on discrete events
  const [uiScore, setUiScore] = useState(0);
  const [uiStreak, setUiStreak] = useState(0);
  const [uiUnbankedOrbs, setUiUnbankedOrbs] = useState(0);
  const [uiShields, setUiShields] = useState(0);
  const [uiSongTime, setUiSongTime] = useState(0);
  const [uiSection, setUiSection] = useState<SongSection>('INTRO');
  const [uiWaveMode, setUiWaveMode] = useState<WaveModeId>('CW_GREEN');
  const [uiPhase, setUiPhase] = useState<GamePhase>('IDLE');
  const [uiBeatLed, setUiBeatLed] = useState(0);
  const [uiActiveLesson, setUiActiveLesson] = useState<TutorialLesson | null>(null);
  const [uiTutorialLives, setUiTutorialLives] = useState(3);
  const [uiIsTutorialRun, setUiIsTutorialRun] = useState(false);
  const [uiSandboxMode, setUiSandboxMode] = useState<WaveModeId | null>(null);

  const profileRef = useRef(profile);
  profileRef.current = profile;
  const songsRef = useRef(songs);
  songsRef.current = songs;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const pauseOpenRef = useRef(pauseOpen);
  pauseOpenRef.current = pauseOpen;
  const modsOpenRef = useRef(modsOpen);
  modsOpenRef.current = modsOpen;
  const orbShopOpenRef = useRef(orbShopOpen);
  orbShopOpenRef.current = orbShopOpen;
  const phaseBeforeOverlayRef = useRef<GamePhase>('IDLE');
  const lastInputTimestampRef = useRef(0);
  const lastTutorialStripeRef = useRef(false);

  const engineRef = useRef<RuntimeEngine>({
    phase: 'IDLE',
    score: 0,
    streak: 0,
    maxStreakInRun: 0,
    unbankedOrbs: 0,
    shields: 0,
    spinnerAngle: -Math.PI / 2,
    direction: 1,
    baseAngularSpeed: 1.5,
    angularSpeed: 1.5,
    waveModeId: 'CW_GREEN',
    waveIndex: 0,
    targets: [],
    hazards: [],
    portal: null,
    waveElapsed: 0,
    songTime: 0,
    songSection: 'INTRO',
    beatmap: [],
    beatmapIndex: 0,
    hitEffects: [],
    hitErrorTicks: [],
    hubStatusText: 'READY',
    hubStatusColor: null,
    hubStatusTimer: 0,
    shakeTime: 0,
    shakeAmplitude: 0,
    shakeX: 0,
    missReason: '',
    missDegrees: '0.0',
    missNearestEdge: 0,
    missSignedSpan: 0,
    perfectCount: 0,
    greatCount: 0,
    goodCount: 0,
    missCount: 0,
    runOffsetDegSum: 0,
    runHitCount: 0,
    runOffsetSamples: [],
    isTutorialRun: false,
    tutorialLives: 3,
    shownLessonIds: new Set<string>(),
    activeLesson: null,
    lessonSlowActive: false,
    tutorialGuideDisabled: false,
    dialTimeScale: 1.0,
    cinematicTimer: 0,
    dialVisualAlpha: 1,
    dialSpinBoost: 0,
    sandboxModeId: null,
    beatPulse: 0,
    activeBeatLed: -1,
    pendingHits: 0,
    pendingPerfects: 0,
    pendingOffsetDegSum: 0,
    pendingMisses: 0,
    pendingEarlyMisses: 0,
    pendingLateMisses: 0,
  });

  const canvasStateRef = useRef<CanvasRenderState>({
    phase: 'IDLE',
    spinnerAngle: -Math.PI / 2,
    direction: 1,
    angularSpeed: 1.5,
    waveModeId: 'CW_GREEN',
    targets: [],
    hazards: [],
    portal: null,
    hitEffects: [],
    hitErrorTicks: [],
    hubStatusText: 'READY',
    hubStatusColor: null,
    hubStatusTimer: 0,
    shakeX: 0,
    missDegrees: '0.0',
    missNearestEdge: 0,
    missSignedSpan: 0,
    dialVisualAlpha: 1,
    bassEnergy: 0,
    spectrumBins: new Float32Array(36),
    beatPulse: 0,
    streak: 0,
    songProgressRatio: 0,
    songSections: [],
    songSection: 'INTRO',
    lessonSlowActive: false,
    activeLesson: null,
  });

  // Apply CSS custom properties whenever theme changes
  useEffect(() => {
    const t = CHASSIS_THEMES[profile.theme] || CHASSIS_THEMES.emerald;
    document.documentElement.style.setProperty('--theme-primary', t.primary);
    document.documentElement.style.setProperty('--theme-bright', t.bright);
    document.documentElement.style.setProperty('--theme-dim', t.dim);
    document.documentElement.style.setProperty('--theme-on-primary', t.onPrimary);
    document.documentElement.style.setProperty('--accent', t.primary);
    document.documentElement.style.setProperty('--accent-bright', t.bright);
    document.documentElement.style.setProperty('--accent-dim', t.dim);
    document.documentElement.style.setProperty('--accent-on', t.onPrimary);
  }, [profile.theme]);

  const updateProfile = useCallback((updater: Partial<PlayerProfile> | ((p: PlayerProfile) => PlayerProfile)) => {
    setProfile((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveProfile(next);
      return next;
    });
  }, []);

  const flushRunProfileDeltas = useCallback(() => {
    const eng = engineRef.current;
    if (
      eng.pendingHits === 0 &&
      eng.pendingPerfects === 0 &&
      eng.pendingMisses === 0 &&
      eng.pendingOffsetDegSum === 0
    ) {
      return;
    }
    const hits = eng.pendingHits;
    const perfects = eng.pendingPerfects;
    const offsetSum = eng.pendingOffsetDegSum;
    const misses = eng.pendingMisses;
    const early = eng.pendingEarlyMisses;
    const late = eng.pendingLateMisses;
    eng.pendingHits = 0;
    eng.pendingPerfects = 0;
    eng.pendingOffsetDegSum = 0;
    eng.pendingMisses = 0;
    eng.pendingEarlyMisses = 0;
    eng.pendingLateMisses = 0;

    updateProfile((prev) => ({
      ...prev,
      totalHits: prev.totalHits + hits,
      totalPerfects: prev.totalPerfects + perfects,
      offsetDegSum: prev.offsetDegSum + offsetSum,
      totalMisses: prev.totalMisses + misses,
      earlyMisses: prev.earlyMisses + early,
      lateMisses: prev.lateMisses + late,
    }));
  }, [updateProfile]);

  const getActiveSong = useCallback(
    (p: PlayerProfile = profileRef.current, list: SongDefinition[] = songsRef.current) => {
      return list.find((s) => s.id === p.selectedSongId) || list[0];
    },
    [],
  );

  const getEffectiveDifficulty = useCallback(
    (p: PlayerProfile = profileRef.current, song?: SongDefinition): DifficultyId => {
      const s = song || getActiveSong(p);
      if (s.chillOnly) return 'CHILL';
      return p.selectedDifficulty;
    },
    [getActiveSong],
  );

  const getBaseHalfWidth = useCallback((diffId: DifficultyId, mods: ModCode[]) => {
    const diff = DIFFICULTIES[diffId] || DIFFICULTIES.CHILL;
    let hw = 0.44 * diff.arcScale;
    if (mods.includes('HR')) hw *= 0.78;
    if (mods.includes('EZ')) hw *= 1.28;
    return Math.max(0.11, Math.min(0.68, hw));
  }, []);

  const computeAngularSpeed = useCallback(
    (diffId: DifficultyId, mods: ModCode[], stepSec: number, modeId: WaveModeId) => {
      const diff = DIFFICULTIES[diffId] || DIFFICULTIES.CHILL;
      let speed = diff.baseSpeed;
      if (stepSec > 0) {
        const rhythmSpeed = 2.55 / Math.max(0.32, stepSec);
        speed = 0.55 * diff.baseSpeed + 0.45 * rhythmSpeed;
      }
      if (mods.includes('DT')) speed *= 1.22;
      if (modeId === 'PURPLE_SURGE') speed *= 1.38;
      return Math.max(1.2, Math.min(7.6, speed));
    },
    [],
  );

  const startSongPreview = useCallback((song: SongDefinition, p: PlayerProfile = profileRef.current) => {
    if (!p.musicEnabled) {
      audioEngine.stop();
      return;
    }
    const previewOffset = Math.min(song.durationSec * 0.28, 28);
    audioEngine
      .startAtOffset(
        song,
        previewOffset,
        p.musicEnabled,
        p.musicVolume,
        p.soundEnabled,
        p.sfxVolume,
        true,
        0.52,
      )
      .then((realDur) => {
        if (realDur && Math.abs(realDur - song.durationSec) > 1.5) {
          setSongs((prev) =>
            prev.map((item) => (item.id === song.id ? { ...item, durationSec: realDur } : item)),
          );
        }
      });
  }, []);

  const finalizeRunSummary = useCallback(
    (cleared: boolean) => {
      const eng = engineRef.current;
      const p = profileRef.current;
      const song = getActiveSong(p);
      const diffId = getEffectiveDifficulty(p, song);

      audioEngine.stop();

      const totalAttempts = eng.perfectCount + eng.greatCount + eng.goodCount + eng.missCount;
      const weighted = eng.perfectCount * 1.0 + eng.greatCount * 0.75 + eng.goodCount * 0.45;
      const accuracy = totalAttempts > 0 ? (weighted / totalAttempts) * 100 : cleared ? 100 : 0;
      const rank = computeLetterRank(accuracy, eng.missCount, cleared);
      const isSilverRank = p.equippedMods.includes('HD') && (rank === 'SS' || rank === 'S');
      const avgOffsetDeg = eng.runHitCount > 0 ? eng.runOffsetDegSum / eng.runHitCount : 0;

      // Orb Cash-Out Rules: Orbs from PERFECT strikes + S/SS/A/B rank bonus ONLY bank on C rank or higher!
      const cashOutApproved = !eng.sandboxModeId && isCashOutEligible(rank);
      const rankBonusOrbs = cashOutApproved ? computeRankOrbBonus(rank, diffId) : 0;
      const cashedOutOrbs = cashOutApproved ? eng.unbankedOrbs + rankBonusOrbs : 0;

      const prevRec = p.songRecords[song.id];
      const isNewBest = !prevRec || eng.score > prevRec.bestScore;

      const rankOrder = ['SS', 'S', 'A', 'B', 'C', 'D', 'F'];
      const prevIdx = prevRec ? rankOrder.indexOf(prevRec.bestRank) : 99;
      const curIdx = rankOrder.indexOf(rank);
      const bestRank = prevRec && prevIdx >= 0 && prevIdx < curIdx ? prevRec.bestRank : rank;

      const nextRecords = eng.sandboxModeId
        ? p.songRecords
        : {
            ...p.songRecords,
            [song.id]: {
              bestScore: Math.max(prevRec?.bestScore || 0, eng.score),
              bestRank,
              bestAccuracy: Math.max(prevRec?.bestAccuracy || 0, accuracy),
              bestCombo: Math.max(prevRec?.bestCombo || 0, eng.maxStreakInRun),
            },
          };

      const nextTierBests = { ...p.tierBestScores };
      if (!eng.sandboxModeId && eng.score > (nextTierBests[diffId] || 0)) {
        nextTierBests[diffId] = eng.score;
      }

      const nextOrbs = p.orbs + cashedOutOrbs;
      const nextTotalOrbs = p.totalOrbsEarned + cashedOutOrbs;

      const nextTutorialDone =
        p.tutorialSongCompleted ||
        (cleared && song.id === 'moments_passing' && !eng.sandboxModeId);

      if (cleared) {
        audioEngine.playLevelClear(p.soundEnabled);
      }

      const hitsDelta = eng.pendingHits;
      const perfectsDelta = eng.pendingPerfects;
      const offsetDelta = eng.pendingOffsetDegSum;
      const missesDelta = eng.pendingMisses;
      const earlyDelta = eng.pendingEarlyMisses;
      const lateDelta = eng.pendingLateMisses;
      eng.pendingHits = 0;
      eng.pendingPerfects = 0;
      eng.pendingOffsetDegSum = 0;
      eng.pendingMisses = 0;
      eng.pendingEarlyMisses = 0;
      eng.pendingLateMisses = 0;

      updateProfile((prev) => ({
        ...prev,
        tutorialSongCompleted: nextTutorialDone,
        orbs: nextOrbs,
        totalOrbsEarned: nextTotalOrbs,
        songRecords: nextRecords,
        tierBestScores: nextTierBests,
        bestScore: Math.max(prev.bestScore, eng.sandboxModeId ? 0 : eng.score),
        bestStreak: Math.max(prev.bestStreak, eng.maxStreakInRun),
        totalHits: prev.totalHits + hitsDelta,
        totalPerfects: prev.totalPerfects + perfectsDelta,
        offsetDegSum: prev.offsetDegSum + offsetDelta,
        totalMisses: prev.totalMisses + missesDelta,
        earlyMisses: prev.earlyMisses + earlyDelta,
        lateMisses: prev.lateMisses + lateDelta,
      }));

      const summary: RunSummaryData = {
        cleared,
        songId: song.id,
        songTitle: song.title,
        artist: song.artist,
        difficulty: diffId,
        score: eng.score,
        previousBestScore: prevRec?.bestScore || 0,
        maxCombo: eng.maxStreakInRun,
        accuracy,
        rank,
        isSilverRank,
        perfectCount: eng.perfectCount,
        greatCount: eng.greatCount,
        goodCount: eng.goodCount,
        missCount: eng.missCount,
        avgOffsetDeg,
        offsetSamples: [...eng.runOffsetSamples],
        unbankedOrbs: eng.unbankedOrbs,
        rankBonusOrbs,
        cashedOutOrbs,
        cashOutApproved,
        missReason: cleared ? undefined : eng.missReason,
        missDegrees: cleared ? undefined : eng.missDegrees,
        isNewBest,
      };

      orbitEvents.emit('onRunComplete', summary);

      // Special First-Run Tutorial Completion Spin-Fade Cinematic before showing Summary
      if (cleared && song.id === 'moments_passing' && !p.tutorialSongCompleted && !eng.sandboxModeId) {
        eng.phase = 'TUTORIAL_CINEMATIC';
        eng.cinematicTimer = 0;
        eng.activeLesson = null;
        eng.lessonSlowActive = false;
        setUiActiveLesson(null);
        setUiPhase('TUTORIAL_CINEMATIC');
        setSummaryData(summary);
        return;
      }

      eng.phase = 'SUMMARY';
      setUiPhase('SUMMARY');
      setSummaryData(summary);
    },
    [getActiveSong, getEffectiveDifficulty, updateProfile],
  );

  const spawnNextWave = useCallback(
    (isFirstNote = false, overrideMode: WaveModeId | null = null) => {
      const eng = engineRef.current;
      const p = profileRef.current;
      const song = getActiveSong(p);
      const diffId = getEffectiveDifficulty(p, song);

      let note: BeatmapNote | null = null;
      if (eng.phase === 'PLAYING' && !eng.sandboxModeId) {
        if (eng.beatmapIndex < eng.beatmap.length) {
          note = eng.beatmap[eng.beatmapIndex];
          eng.beatmapIndex += 1;
          eng.songSection = note.section;
          setUiSection(note.section);
        } else {
          finalizeRunSummary(true);
          return;
        }
      }

      const modeId: WaveModeId = overrideMode || (note ? note.modeId : 'CW_GREEN');
      eng.waveModeId = modeId;
      eng.waveElapsed = 0;
      eng.hazards = [];
      eng.portal = null;
      setUiWaveMode(modeId);

      if (modeId === 'CCW_RED') eng.direction = -1;
      else if (modeId === 'CW_GREEN') eng.direction = 1;

      eng.baseAngularSpeed = computeAngularSpeed(
        diffId,
        p.equippedMods,
        note ? note.stepSec : 0.9,
        modeId,
      );
      eng.angularSpeed = eng.baseAngularSpeed;

      const baseHW = getBaseHalfWidth(diffId, p.equippedMods);
      let primaryOffset: number;
      if (modeId === 'CASCADE_CHAIN') {
        primaryOffset = 1.05 + Math.random() * 0.65;
      } else if (note && !eng.sandboxModeId) {
        const beatTravel = note.stepSec * eng.baseAngularSpeed;
        primaryOffset = Math.max(1.0, Math.min(5.05, beatTravel * (0.94 + Math.random() * 0.12)));
      } else {
        const minOff = isFirstNote ? 1.65 : 1.45;
        primaryOffset = minOff + Math.random() * (4.55 - minOff);
      }
      const primaryAngle = wrapAngle(eng.spinnerAngle + eng.direction * primaryOffset);

      if (modeId === 'MULTI_CLUSTER') {
        const secondAngle = wrapAngle(primaryAngle + eng.direction * 1.5);
        eng.targets = [
          {
            id: 1,
            angle: primaryAngle,
            baseAngle: primaryAngle,
            halfWidth: baseHW * 0.9,
            initialHalfWidth: baseHW * 0.9,
            tapsLeft: 1,
            seqNum: 0,
            alpha: 1,
            enteredWindow: false,
          },
          {
            id: 2,
            angle: secondAngle,
            baseAngle: secondAngle,
            halfWidth: baseHW * 0.9,
            initialHalfWidth: baseHW * 0.9,
            tapsLeft: 1,
            seqNum: 0,
            alpha: 1,
            enteredWindow: false,
          },
        ];
      } else if (modeId === 'ORDERED_SEQ') {
        const a1 = wrapAngle(eng.spinnerAngle + eng.direction * 1.35);
        const a2 = wrapAngle(a1 + eng.direction * 1.35);
        const a3 = wrapAngle(a2 + eng.direction * 1.35);
        const hw = baseHW * 0.85;
        eng.targets = [
          { id: 1, angle: a1, baseAngle: a1, halfWidth: hw, initialHalfWidth: hw, tapsLeft: 1, seqNum: 1, alpha: 1, enteredWindow: false },
          { id: 2, angle: a2, baseAngle: a2, halfWidth: hw, initialHalfWidth: hw, tapsLeft: 1, seqNum: 2, alpha: 1, enteredWindow: false },
          { id: 3, angle: a3, baseAngle: a3, halfWidth: hw, initialHalfWidth: hw, tapsLeft: 1, seqNum: 3, alpha: 1, enteredWindow: false },
        ];
      } else if (modeId === 'OSU_PORTAL') {
        const entryA = wrapAngle(eng.spinnerAngle + eng.direction * 1.4);
        const exitA = wrapAngle(entryA + Math.PI);
        const targetA = wrapAngle(exitA + eng.direction * 1.35);
        eng.portal = { entryAngle: entryA, exitAngle: exitA, halfWidth: 0.24, warped: false, warpFlashTimer: 0 };
        eng.targets = [
          {
            id: 1,
            angle: targetA,
            baseAngle: targetA,
            halfWidth: baseHW,
            initialHalfWidth: baseHW,
            tapsLeft: 1,
            seqNum: 0,
            alpha: 1,
            enteredWindow: false,
          },
        ];
      } else {
        const hw =
          modeId === 'SNIPER_MICRO'
            ? baseHW * 0.56
            : modeId === 'DECAY_ARC'
            ? baseHW * 1.25
            : baseHW;
        const taps = modeId === 'DOUBLE_TAP' ? 2 : 1;
        eng.targets = [
          {
            id: 1,
            angle: primaryAngle,
            baseAngle: primaryAngle,
            halfWidth: hw,
            initialHalfWidth: hw,
            tapsLeft: taps,
            seqNum: 0,
            alpha: 1,
            enteredWindow: false,
          },
        ];

        if (modeId === 'HAZARD_DECOY') {
          const hazGap = hw + 0.34;
          eng.hazards = [
            { angle: wrapAngle(primaryAngle - hazGap), halfWidth: 0.14 },
            { angle: wrapAngle(primaryAngle + hazGap), halfWidth: 0.14 },
          ];
        }
      }
    },
    [computeAngularSpeed, finalizeRunSummary, getActiveSong, getBaseHalfWidth, getEffectiveDifficulty],
  );

  const resetRound = useCallback(
    (
      autoStart: boolean,
      sandboxMode: WaveModeId | null = null,
      songOverride?: SongDefinition,
      diffOverride?: DifficultyId,
    ) => {
      const p = profileRef.current;
      const song = songOverride || getActiveSong(p);
      const diffId = diffOverride || getEffectiveDifficulty(p, song);
      const eng = engineRef.current;

      setSummaryData(null);
      lastTutorialStripeRef.current = false;
      setShowTutorialCompleteStripe(false);

      eng.sandboxModeId = sandboxMode;
      eng.isTutorialRun = song.id === 'moments_passing' && !p.tutorialSongCompleted && !sandboxMode;
      eng.tutorialLives = 3;
      eng.shownLessonIds = new Set<string>();
      eng.activeLesson = null;
      eng.lessonSlowActive = false;
      eng.tutorialGuideDisabled = false;
      eng.dialTimeScale = 1.0;

      eng.score = 0;
      eng.streak = 0;
      eng.maxStreakInRun = 0;
      eng.unbankedOrbs = 0;
      eng.shields = 0;
      eng.direction = 1;
      eng.spinnerAngle = -Math.PI / 2;
      eng.waveIndex = 0;
      eng.songTime = 0;
      eng.songSection = 'INTRO';
      eng.hitEffects = [];
      eng.hitErrorTicks = [];
      eng.hubStatusTimer = 0;
      eng.hubStatusColor = null;
      eng.shakeTime = 0;
      eng.shakeX = 0;
      eng.missReason = '';
      eng.dialVisualAlpha = 1;
      eng.dialSpinBoost = 0;
      eng.perfectCount = 0;
      eng.greatCount = 0;
      eng.goodCount = 0;
      eng.missCount = 0;
      eng.runOffsetDegSum = 0;
      eng.runHitCount = 0;
      eng.runOffsetSamples = [];

      eng.beatmap = buildSongBeatmap(song, diffId, p.equippedMods);
      eng.beatmapIndex = 0;
      eng.phase = autoStart ? 'PLAYING' : 'IDLE';
      orbitEvents.emit('onTrackChange', { songId: song.id, title: song.title, difficulty: diffId });

      setUiScore(0);
      setUiStreak(0);
      setUiUnbankedOrbs(0);
      setUiShields(0);
      setUiSongTime(0);
      setUiSection('INTRO');
      setUiActiveLesson(null);
      setUiTutorialLives(3);
      setUiIsTutorialRun(eng.isTutorialRun);
      setUiSandboxMode(sandboxMode);
      setUiPhase(eng.phase);

      spawnNextWave(true, sandboxMode);

      if (autoStart) {
        // Pure 1.0x audio playback — zero distortion
        audioEngine
          .startAtOffset(
            song,
            0,
            p.musicEnabled,
            p.musicVolume,
            p.soundEnabled,
            p.sfxVolume,
            Boolean(sandboxMode),
            1.0,
          )
          .then((realDur) => {
            if (realDur && Math.abs(realDur - song.durationSec) > 1.5) {
              setSongs((prev) =>
                prev.map((item) => (item.id === song.id ? { ...item, durationSec: realDur } : item)),
              );
            }
          });
      } else {
        audioEngine.stop();
      }
    },
    [getActiveSong, getEffectiveDifficulty, spawnNextWave],
  );

  // Initial setup + preload active song buffer + silent first-gesture WebAudio unlock
  useEffect(() => {
    resetRound(false, null);
    const active = getActiveSong();
    audioEngine.loadSongBuffer(active).then((buf) => {
      if (buf && Math.abs(buf.duration - active.durationSec) > 1.5) {
        setSongs((prev) =>
          prev.map((item) => (item.id === active.id ? { ...item, durationSec: buf.duration } : item)),
        );
      }
    });

    const handleFirstUnlock = () => {
      const p = profileRef.current;
      audioEngine.unlock();
      audioEngine.updateVolumes(p.musicEnabled, p.musicVolume, p.soundEnabled, p.sfxVolume);
    };
    window.addEventListener('pointerdown', handleFirstUnlock, { passive: true, once: true });
    window.addEventListener('keydown', handleFirstUnlock, { passive: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstUnlock);
      window.removeEventListener('keydown', handleFirstUnlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onBeforeUnload = () => flushRunProfileDeltas();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      warpTimersRef.current.forEach((id) => window.clearTimeout(id));
      warpTimersRef.current = [];
    };
  }, [flushRunProfileDeltas]);

  const triggerMiss = useCallback(
    (reasonText: string, targetRef?: TargetSector) => {
      const eng = engineRef.current;
      const p = profileRef.current;

      if (eng.lessonSlowActive) {
        eng.lessonSlowActive = false;
        eng.activeLesson = null;
        eng.dialTimeScale = 1.0;
        setUiActiveLesson(null);
      }

      if (eng.shields > 0) {
        eng.shields -= 1;
        setUiShields(eng.shields);
        eng.shakeTime = 0.25;
        eng.shakeAmplitude = 8;
        eng.hubStatusText = 'SHIELDED';
        eng.hubStatusColor = '#34d399';
        eng.hubStatusTimer = 0.7;
        audioEngine.playShieldBreak(p.soundEnabled);
        spawnNextWave(false, eng.sandboxModeId);
        return;
      }

      if (eng.isTutorialRun) {
        eng.tutorialLives -= 1;
        setUiTutorialLives(eng.tutorialLives);
        if (eng.tutorialLives > 0) {
          eng.streak = 0;
          eng.missCount += 1;
          setUiStreak(0);
          eng.shakeTime = 0.28;
          eng.shakeAmplitude = 9;
          eng.hubStatusText = `${eng.tutorialLives} LIVES`;
          eng.hubStatusColor = '#f59e0b';
          eng.hubStatusTimer = 0.85;
          audioEngine.playShieldBreak(p.soundEnabled);
          spawnNextWave(false, null);
          return;
        }
      }

      audioEngine.playMiss(p.soundEnabled);
      eng.missCount += 1;

      const ref = targetRef || eng.targets[0];
      if (ref) {
        const tStart = wrapAngle(ref.angle - ref.halfWidth);
        const tEnd = wrapAngle(ref.angle + ref.halfWidth);
        const dStart = signedAngleDiff(eng.spinnerAngle, tStart);
        const dEnd = signedAngleDiff(eng.spinnerAngle, tEnd);
        if (Math.abs(dStart) <= Math.abs(dEnd)) {
          eng.missNearestEdge = tStart;
          eng.missSignedSpan = dStart;
        } else {
          eng.missNearestEdge = tEnd;
          eng.missSignedSpan = dEnd;
        }
        const absDelta = Math.abs(signedAngleDiff(eng.spinnerAngle, ref.angle));
        const missRad = Math.max(0.002, absDelta - (ref.halfWidth + NEEDLE_TOLERANCE));
        eng.missDegrees = (missRad * (180 / Math.PI)).toFixed(1);
        const dirErr = signedAngleDiff(eng.spinnerAngle, ref.angle) * eng.direction;
        const isEarly = dirErr < 0;

        eng.hitErrorTicks.push({
          offsetSigned: isEarly ? -1 : 1,
          color: '#ef4444',
          age: 0,
        });
        if (eng.hitErrorTicks.length > 16) eng.hitErrorTicks.shift();

        eng.pendingMisses += 1;
        if (isEarly) eng.pendingEarlyMisses += 1;
        else eng.pendingLateMisses += 1;
      }

      eng.missReason = reasonText;
      eng.shakeTime = 0.34;
      eng.shakeAmplitude = 11;
      orbitEvents.emit('onMiss', {
        reason: reasonText,
        degrees: eng.missDegrees,
        songId: getActiveSong(p).id,
      });
      finalizeRunSummary(false);
    },
    [finalizeRunSummary, getActiveSong, spawnNextWave],
  );

  const handleTriggerAction = useCallback(() => {
    if (screenRef.current !== 'PLAYING') return;
    if (pauseOpenRef.current || modsOpenRef.current || orbShopOpenRef.current) return;

    // 18ms anti-bounce guard prevents duplicate pointer+key double triggers without blocking fast alternating double-taps
    const nowMs = performance.now();
    if (nowMs - lastInputTimestampRef.current < 18) return;
    lastInputTimestampRef.current = nowMs;

    const eng = engineRef.current;
    const p = profileRef.current;

    if (eng.phase === 'IDLE' || eng.phase === 'SUMMARY') {
      audioEngine.ensureContext();
      resetRound(true, eng.sandboxModeId);
      return;
    }

    if (eng.phase !== 'PLAYING') return;

    // 1. Check Hazard Mines
    for (let i = 0; i < eng.hazards.length; i++) {
      const h = eng.hazards[i];
      if (Math.abs(signedAngleDiff(eng.spinnerAngle, h.angle)) <= h.halfWidth + 0.01) {
        triggerMiss('HAZARD HIT', eng.targets[0]);
        return;
      }
    }

    // 2. Find closest matching target
    let matchedIdx = -1;
    let bestAbsDelta = Infinity;
    for (let i = 0; i < eng.targets.length; i++) {
      const t = eng.targets[i];
      const absD = Math.abs(signedAngleDiff(eng.spinnerAngle, t.angle));
      if (absD <= t.halfWidth + NEEDLE_TOLERANCE && absD < bestAbsDelta) {
        bestAbsDelta = absD;
        matchedIdx = i;
      }
    }

    if (matchedIdx === -1) {
      let nearest = eng.targets[0];
      let minD = Infinity;
      for (const t of eng.targets) {
        const d = Math.abs(signedAngleDiff(eng.spinnerAngle, t.angle));
        if (d < minD) {
          minD = d;
          nearest = t;
        }
      }
      const dirErr = nearest ? signedAngleDiff(eng.spinnerAngle, nearest.angle) * eng.direction : 0;
      triggerMiss(dirErr < 0 ? 'TOO EARLY' : 'TOO LATE', nearest);
      return;
    }

    const hitTarget = eng.targets[matchedIdx];
    if (eng.waveModeId === 'ORDERED_SEQ' && matchedIdx !== 0) {
      triggerMiss('WRONG ORDER', hitTarget);
      return;
    }

    // Resume normal dial tempo smoothly (audio was never slowed!)
    if (eng.lessonSlowActive) {
      eng.lessonSlowActive = false;
      eng.activeLesson = null;
      eng.dialTimeScale = 1.0;
      setUiActiveLesson(null);
    }

    const ratio = bestAbsDelta / Math.max(0.01, hitTarget.halfWidth);
    const tier: JudgmentTier = ratio <= 0.24 ? 'PERFECT' : ratio <= 0.62 ? 'GREAT' : 'GOOD';
    const isPerfect = tier === 'PERFECT';
    const fxColor = tier === 'PERFECT' ? '#ffffff' : tier === 'GREAT' ? '#34d399' : '#38bdf8';

    // Record Hit Error Timing Meter tick
    const signedErr = signedAngleDiff(eng.spinnerAngle, hitTarget.angle) * eng.direction;
    const offsetSigned = Math.max(-1, Math.min(1, signedErr / Math.max(0.05, hitTarget.halfWidth + NEEDLE_TOLERANCE)));
    eng.hitErrorTicks.push({ offsetSigned, color: fxColor, age: 0 });
    if (eng.hitErrorTicks.length > 16) eng.hitErrorTicks.shift();

    const song = getActiveSong(p);
    const diffId = getEffectiveDifficulty(p, song);

    // Double-Tap first tap
    if (hitTarget.tapsLeft > 1) {
      hitTarget.tapsLeft -= 1;
      hitTarget.halfWidth *= 0.85;
      audioEngine.playHit(p.soundEnabled, p.hitSfxMode, eng.streak, isPerfect, song.scaleNotes);
      eng.hitEffects.push({
        timer: 0.34,
        duration: 0.34,
        angle: eng.spinnerAngle,
        isPerfect,
        label: 'TAP AGAIN',
        color: '#38bdf8',
      });
      eng.hubStatusText = 'TAP AGAIN';
      eng.hubStatusColor = '#38bdf8';
      eng.hubStatusTimer = 0.35;
      return;
    }

    // Sector Cleared!
    eng.targets.splice(matchedIdx, 1);
    eng.streak += 1;
    eng.maxStreakInRun = Math.max(eng.maxStreakInRun, eng.streak);

    const pts = computeHitPoints(tier, diffId, p.equippedMods, eng.streak);
    eng.score += pts;

    if (tier === 'PERFECT') {
      eng.perfectCount += 1;
      if (!eng.sandboxModeId) {
        eng.unbankedOrbs += 1;
        setUiUnbankedOrbs(eng.unbankedOrbs);
      }
    } else if (tier === 'GREAT') {
      eng.greatCount += 1;
    } else {
      eng.goodCount += 1;
    }

    const offsetDeg = bestAbsDelta * (180 / Math.PI);
    eng.runOffsetDegSum += offsetDeg;
    eng.runHitCount += 1;
    eng.runOffsetSamples.push(offsetSigned);

    if (p.equippedMods.includes('SH') && eng.streak % 12 === 0 && eng.shields < 2) {
      eng.shields += 1;
      setUiShields(eng.shields);
    }

    // Escalating Combo Milestone Hooks & Harmonic Chimes (25x, 50x, 100x)
    if (eng.streak === 25 || eng.streak === 50 || eng.streak === 100) {
      const mTier: 1 | 2 | 3 = eng.streak === 100 ? 3 : eng.streak === 50 ? 2 : 1;
      audioEngine.playComboMilestone(p.soundEnabled, mTier);
      orbitEvents.emit('onComboMilestone', { streak: eng.streak, tier: mTier });
    }

    orbitEvents.emit('onHit', {
      tier,
      streak: eng.streak,
      points: pts,
      offsetSigned,
      songId: song.id,
    });

    audioEngine.playHit(p.soundEnabled, p.hitSfxMode, eng.streak, isPerfect, song.scaleNotes);
    eng.hitEffects.push({
      timer: 0.36,
      duration: 0.36,
      angle: eng.spinnerAngle,
      isPerfect,
      label: isPerfect && !eng.sandboxModeId ? `${tier} +${pts} (+1 Orb)` : `${tier} +${pts}`,
      color: fxColor,
    });
    if (eng.hitEffects.length > 5) eng.hitEffects.shift();

    eng.hubStatusText = tier;
    eng.hubStatusColor = fxColor;
    eng.hubStatusTimer = 0.42;

    setUiScore(eng.score);
    setUiStreak(eng.streak);

    eng.pendingHits += 1;
    if (isPerfect) eng.pendingPerfects += 1;
    eng.pendingOffsetDegSum += offsetDeg;

    if (eng.targets.length > 0) return;

    eng.waveIndex += 1;
    spawnNextWave(false, eng.sandboxModeId);
  }, [
    getActiveSong,
    getEffectiveDifficulty,
    resetRound,
    spawnNextWave,
    triggerMiss,
  ]);

  // Main Fixed-Cap 60fps Update Loop
  useEffect(() => {
    let lastTime = performance.now();
    let lastHudSync = 0;
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const eng = engineRef.current;
      const p = profileRef.current;
      const song = getActiveSong(p);

      // Update transient VFX & Hit Error Meter ticks
      for (let i = eng.hitEffects.length - 1; i >= 0; i--) {
        eng.hitEffects[i].timer -= dt;
        if (eng.hitEffects[i].timer <= 0) eng.hitEffects.splice(i, 1);
      }

      for (let i = eng.hitErrorTicks.length - 1; i >= 0; i--) {
        eng.hitErrorTicks[i].age += dt;
        if (eng.hitErrorTicks[i].age >= 1.8) eng.hitErrorTicks.splice(i, 1);
      }

      if (eng.hubStatusTimer > 0) {
        eng.hubStatusTimer = Math.max(0, eng.hubStatusTimer - dt);
      }

      if (eng.shakeTime > 0) {
        eng.shakeTime = Math.max(0, eng.shakeTime - dt);
        const prog = 1 - eng.shakeTime / 0.34;
        eng.shakeX = Math.sin(prog * Math.PI * 10) * eng.shakeAmplitude * Math.pow(1 - prog, 2);
        if (eng.shakeTime === 0) eng.shakeX = 0;
      }

      // Beat telemetry LEDs synced cleanly to natural 1.0x BPM
      eng.beatPulse = Math.max(0, eng.beatPulse - dt * 4.5);
      const tRef = eng.songTime > 0 ? eng.songTime : now / 1000;
      const ledIdx = Math.floor(tRef / (60 / Math.max(60, song.bpm))) % 4;
      if (ledIdx !== eng.activeBeatLed) {
        eng.activeBeatLed = ledIdx;
        eng.beatPulse = 0.85;
        setUiBeatLed(ledIdx);
        orbitEvents.emit('onBeat', { beatIndex: ledIdx, bpm: song.bpm, songId: song.id });
      }

      // Post-Tutorial Spin-Fade Cinematic
      if (eng.phase === 'TUTORIAL_CINEMATIC') {
        eng.cinematicTimer += dt;
        const t = eng.cinematicTimer;

        if (t < 0.85) {
          const prog = t / 0.85;
          eng.dialSpinBoost = 12 * prog;
          eng.dialVisualAlpha = Math.max(0, 1 - prog);
        } else if (t < 2.0) {
          eng.dialVisualAlpha = 0;
        } else if (t < 2.65) {
          const prog = (t - 2.0) / 0.65;
          eng.dialSpinBoost = 6 * (1 - prog);
          eng.dialVisualAlpha = Math.min(1, prog);
        } else {
          eng.dialSpinBoost = 0;
          eng.dialVisualAlpha = 1;
        }

        const stripeActive = t >= 0.65 && t < 2.15;
        if (stripeActive !== lastTutorialStripeRef.current) {
          lastTutorialStripeRef.current = stripeActive;
          setShowTutorialCompleteStripe(stripeActive);
        }
        eng.spinnerAngle = wrapAngle(eng.spinnerAngle + (eng.angularSpeed + eng.dialSpinBoost) * dt);

        if (t >= 2.75) {
          if (lastTutorialStripeRef.current) {
            lastTutorialStripeRef.current = false;
            setShowTutorialCompleteStripe(false);
          }
          eng.dialVisualAlpha = 1;
          eng.dialSpinBoost = 0;
          eng.phase = 'SUMMARY';
          setUiPhase('SUMMARY');
        }
      } else if (eng.phase === 'PLAYING' && screenRef.current === 'PLAYING') {
        // Song clock stays strictly 1.0x synced with audio + user offset
        const audioClock = audioEngine.syncClock();
        const offsetSec = p.audioOffsetMs / 1000;
        if (audioClock !== null && !eng.sandboxModeId) {
          eng.songTime = Math.max(0, audioClock + offsetSec);
        } else {
          eng.songTime += dt;
        }

        if (now - lastHudSync > 120) {
          lastHudSync = now;
          setUiSongTime(eng.songTime);
          const sec = getSectionAtProgress(song, eng.songTime / Math.max(1, song.durationSec));
          if (sec !== eng.songSection) {
            eng.songSection = sec;
            setUiSection(sec);
          }
        }

        if (!eng.sandboxModeId && eng.songTime >= song.durationSec) {
          finalizeRunSummary(true);
        } else {
          // Non-Distorting Dial Slow-Motion Tutorial Checkpoints (music keeps playing cleanly at 1.0x)
          if (
            eng.isTutorialRun &&
            !eng.tutorialGuideDisabled &&
            !eng.lessonSlowActive &&
            eng.targets.length > 0
          ) {
            const nextLesson = TUTORIAL_LESSONS.find(
              (l) =>
                !eng.shownLessonIds.has(l.id) &&
                eng.waveIndex >= l.minWaveIndex &&
                (l.triggerMode === 'ANY' || l.triggerMode === eng.waveModeId),
            );
            if (nextLesson) {
              const t0 = eng.targets[0];
              const signedAhead = signedAngleDiff(t0.angle, eng.spinnerAngle) * eng.direction;
              if (signedAhead > 0.15 && signedAhead < 0.92) {
                eng.shownLessonIds.add(nextLesson.id);
                eng.lessonSlowActive = true;
                eng.activeLesson = nextLesson;
                eng.dialTimeScale = 0.28;
                audioEngine.playLessonSlowCue(p.soundEnabled);
                setUiActiveLesson(nextLesson);
              }
            }
          }

          const targetDialScale = eng.lessonSlowActive ? 0.28 : 1.0;
          eng.dialTimeScale += (targetDialScale - eng.dialTimeScale) * Math.min(1, dt * 10);

          const simDt = dt * eng.dialTimeScale;
          eng.waveElapsed += simDt;

          if (eng.waveModeId === 'BRAKE_DRIFT') {
            const mod = 0.55 + 0.65 * Math.abs(Math.sin(eng.waveElapsed * 3.4));
            eng.angularSpeed = eng.baseAngularSpeed * mod;
          } else {
            eng.angularSpeed = eng.baseAngularSpeed;
          }

          for (let i = 0; i < eng.targets.length; i++) {
            const t = eng.targets[i];
            if (eng.waveModeId === 'SPRING_BOUNCE') {
              t.angle = wrapAngle(t.baseAngle + Math.sin(eng.waveElapsed * 2.8) * 0.42);
            }
            if (eng.waveModeId === 'DECAY_ARC') {
              t.halfWidth = Math.max(0.11, t.initialHalfWidth - eng.waveElapsed * 0.085);
            }
            if (eng.waveModeId === 'GHOST_PULSE' || p.equippedMods.includes('HD')) {
              const dist = Math.abs(signedAngleDiff(eng.spinnerAngle, t.angle));
              t.alpha = dist < 0.95 ? Math.max(0.12, (dist / 0.95) * 0.75) : 1.0;
            }
          }

          eng.spinnerAngle = wrapAngle(
            eng.spinnerAngle + eng.direction * eng.angularSpeed * simDt,
          );

          // Portal Warp
          if (eng.portal) {
            if (!eng.portal.warped && Math.abs(signedAngleDiff(eng.spinnerAngle, eng.portal.entryAngle)) <= eng.portal.halfWidth) {
              eng.portal.warped = true;
              eng.portal.warpFlashTimer = 0.16;
              eng.spinnerAngle = eng.portal.exitAngle;
              eng.hitEffects.push({
                timer: 0.28,
                duration: 0.28,
                angle: eng.portal.exitAngle,
                isPerfect: false,
                label: 'WARP',
                color: '#e879f9',
              });
            }
          }

          // Multi-Target ONE-PASS Check
          if (eng.waveModeId === 'ONE_PASS' || p.equippedMods.includes('SD')) {
            const targetsToCheck =
              eng.waveModeId === 'ORDERED_SEQ' && eng.targets.length > 0
                ? [eng.targets[0]]
                : eng.targets;

            for (let i = 0; i < targetsToCheck.length; i++) {
              const t = targetsToCheck[i];
              const overNow =
                Math.abs(signedAngleDiff(eng.spinnerAngle, t.angle)) <= t.halfWidth + NEEDLE_TOLERANCE;
              if (overNow) {
                t.enteredWindow = true;
              } else if (t.enteredWindow) {
                triggerMiss('OVERSHOT ONE-PASS', t);
                break;
              }
            }
          }
        }
      }

      // Sync lightweight snapshot to CanvasRenderState ref
      const cs = canvasStateRef.current;
      cs.phase = eng.phase;
      cs.spinnerAngle = eng.spinnerAngle;
      cs.direction = eng.direction;
      cs.angularSpeed = eng.angularSpeed;
      cs.waveModeId = eng.waveModeId;
      cs.targets = eng.targets;
      cs.hazards = eng.hazards;
      cs.portal = eng.portal;
      cs.hitEffects = eng.hitEffects;
      cs.hitErrorTicks = eng.hitErrorTicks;
      cs.hubStatusText = eng.hubStatusText;
      cs.hubStatusColor = eng.hubStatusColor;
      cs.hubStatusTimer = eng.hubStatusTimer;
      cs.shakeX = eng.shakeX;
      cs.missDegrees = eng.missDegrees;
      cs.missNearestEdge = eng.missNearestEdge;
      cs.missSignedSpan = eng.missSignedSpan;
      cs.missReasonText = eng.missReason;
      cs.dialVisualAlpha = eng.dialVisualAlpha;
      cs.bassEnergy = p.bgFxMode === 'dynamic' ? audioEngine.getBassEnergy() : 0;
      if (p.bgFxMode === 'dynamic') {
        audioEngine.getSpectrumBins(cs.spectrumBins);
      } else {
        cs.spectrumBins.fill(0);
      }
      cs.beatPulse = eng.beatPulse;
      cs.streak = eng.streak;
      cs.songProgressRatio = eng.songTime / Math.max(1, song.durationSec);
      cs.songSections = song.sections;
      cs.songSection = eng.songSection;
      cs.lessonSlowActive = eng.lessonSlowActive;
      cs.activeLesson = eng.activeLesson;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [finalizeRunSummary, getActiveSong, resetRound, triggerMiss]);

  // Overlay Management
  const openPause = useCallback(
    (tab: PauseTabId = 'main') => {
      flushRunProfileDeltas();
      setModsOpen(false);
      setOrbShopOpen(false);
      if (!pauseOpenRef.current) {
        phaseBeforeOverlayRef.current =
          screenRef.current === 'PLAYING' ? engineRef.current.phase : 'IDLE';
        if (screenRef.current === 'PLAYING' && engineRef.current.phase === 'PLAYING') {
          engineRef.current.phase = 'PAUSED';
          setUiPhase('PAUSED');
          audioEngine.stop();
        }
      }
      setPauseTab(tab);
      setPauseOpen(true);
    },
    [flushRunProfileDeltas],
  );

  const closePause = useCallback(
    (startSelectedSong = false) => {
      if (mustChooseTrack && !startSelectedSong) {
        setPauseTab('tracks');
        return;
      }
      setListeningSlot(0);
      setPauseOpen(false);

      if (startSelectedSong) {
        setScreen('PLAYING');
        resetRound(true, null);
        return;
      }

      if (screenRef.current === 'PLAYING' && phaseBeforeOverlayRef.current === 'PLAYING') {
        const eng = engineRef.current;
        const p = profileRef.current;
        const song = getActiveSong(p);
        eng.phase = 'PLAYING';
        setUiPhase('PLAYING');
        audioEngine.startAtOffset(
          song,
          eng.songTime,
          p.musicEnabled,
          p.musicVolume,
          p.soundEnabled,
          p.sfxVolume,
          Boolean(eng.sandboxModeId),
          1.0,
        );
      }
    },
    [getActiveSong, mustChooseTrack, resetRound],
  );

  const openMods = useCallback(() => {
    flushRunProfileDeltas();
    setPauseOpen(false);
    setOrbShopOpen(false);
    if (!modsOpenRef.current) {
      phaseBeforeOverlayRef.current =
        screenRef.current === 'PLAYING' ? engineRef.current.phase : 'IDLE';
      if (screenRef.current === 'PLAYING' && engineRef.current.phase === 'PLAYING') {
        engineRef.current.phase = 'PAUSED';
        setUiPhase('PAUSED');
        audioEngine.stop();
      }
    }
    setModsOpen(true);
  }, [flushRunProfileDeltas]);

  const closeMods = useCallback(() => {
    setModsOpen(false);
    if (screenRef.current === 'PLAYING' && phaseBeforeOverlayRef.current === 'PLAYING') {
      const eng = engineRef.current;
      const p = profileRef.current;
      const song = getActiveSong(p);
      eng.phase = 'PLAYING';
      setUiPhase('PLAYING');
      audioEngine.startAtOffset(
        song,
        eng.songTime,
        p.musicEnabled,
        p.musicVolume,
        p.soundEnabled,
        p.sfxVolume,
        Boolean(eng.sandboxModeId),
        1.0,
      );
    }
  }, [getActiveSong]);

  const openOrbVault = useCallback(() => {
    flushRunProfileDeltas();
    setPauseOpen(false);
    setModsOpen(false);
    if (!orbShopOpenRef.current) {
      phaseBeforeOverlayRef.current =
        screenRef.current === 'PLAYING' ? engineRef.current.phase : 'IDLE';
      if (screenRef.current === 'PLAYING' && engineRef.current.phase === 'PLAYING') {
        engineRef.current.phase = 'PAUSED';
        setUiPhase('PAUSED');
        audioEngine.stop();
      }
    }
    setOrbShopOpen(true);
  }, [flushRunProfileDeltas]);

  const closeOrbVault = useCallback(() => {
    setOrbShopOpen(false);
    if (screenRef.current === 'PLAYING' && phaseBeforeOverlayRef.current === 'PLAYING') {
      const eng = engineRef.current;
      const p = profileRef.current;
      const song = getActiveSong(p);
      eng.phase = 'PLAYING';
      setUiPhase('PLAYING');
      audioEngine.startAtOffset(
        song,
        eng.songTime,
        p.musicEnabled,
        p.musicVolume,
        p.soundEnabled,
        p.sfxVolume,
        Boolean(eng.sandboxModeId),
        1.0,
      );
    }
  }, [getActiveSong]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (listeningSlot > 0) {
        e.preventDefault();
        e.stopPropagation();
        if (e.code !== 'Escape') {
          const label = formatKeyLabel(e);
          updateProfile((prev) =>
            listeningSlot === 1
              ? { ...prev, trigger1Code: e.code, trigger1Label: label }
              : { ...prev, trigger2Code: e.code, trigger2Label: label },
          );
          audioEngine.playHit(
            profileRef.current.soundEnabled,
            profileRef.current.hitSfxMode,
            1,
            true,
            getActiveSong().scaleNotes,
          );
        }
        setListeningSlot(0);
        return;
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        if (orbShopOpenRef.current) closeOrbVault();
        else if (modsOpenRef.current) closeMods();
        else if (pauseOpenRef.current) closePause(false);
        else if (screenRef.current === 'PLAYING') openPause('main');
        else if (screenRef.current === 'SONG_SELECT') {
          audioEngine.stop();
          setScreen('TITLE');
        }
        return;
      }

      if (pauseOpenRef.current || modsOpenRef.current || orbShopOpenRef.current) return;

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (screenRef.current !== 'PLAYING') return;

      const p = profileRef.current;
      if (e.code === p.trigger1Code || e.code === p.trigger2Code) {
        e.preventDefault();
        handleTriggerAction();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    closeMods,
    closeOrbVault,
    closePause,
    getActiveSong,
    handleTriggerAction,
    listeningSlot,
    openPause,
    updateProfile,
  ]);

  // Screen Navigation Helpers
  const enterSongSelect = useCallback(() => {
    flushRunProfileDeltas();
    setSummaryData(null);
    setPauseOpen(false);
    setModsOpen(false);
    setOrbShopOpen(false);
    engineRef.current.phase = 'IDLE';
    setUiPhase('IDLE');
    setScreen('SONG_SELECT');
    const active = getActiveSong();
    startSongPreview(active);
  }, [flushRunProfileDeltas, getActiveSong, startSongPreview]);

  const returnToTitle = useCallback(() => {
    flushRunProfileDeltas();
    audioEngine.stop();
    setSummaryData(null);
    setPauseOpen(false);
    setModsOpen(false);
    setOrbShopOpen(false);
    engineRef.current.phase = 'IDLE';
    setUiPhase('IDLE');
    setScreen('TITLE');
  }, [flushRunProfileDeltas]);

  const launchGameplay = useCallback(
    (songOverride?: SongDefinition, diffOverride?: DifficultyId) => {
      setSummaryData(null);
      setPauseOpen(false);
      setModsOpen(false);
      setOrbShopOpen(false);
      setScreen('PLAYING');
      resetRound(true, null, songOverride, diffOverride);
    },
    [resetRound],
  );

  const launchWithZoomWarp = useCallback(
    (song: SongDefinition, diff: DifficultyId, label: string) => {
      if (warpTimersRef.current.length > 0) return;
      const p = profileRef.current;
      audioEngine.ensureContext();
      audioEngine.updateVolumes(p.musicEnabled, p.musicVolume, p.soundEnabled, p.sfxVolume);
      audioEngine.playUiLaunch(p.soundEnabled);
      setWarpLaunchLabel(label.toUpperCase());

      const tSwitch = window.setTimeout(() => {
        launchGameplay(song, diff);
      }, 240);

      const tDone = window.setTimeout(() => {
        setWarpLaunchLabel(null);
        warpTimersRef.current = [];
      }, 500);

      warpTimersRef.current = [tSwitch, tDone];
    },
    [launchGameplay],
  );

  // Orb Vault Purchase Handlers
  const handleUnlockDifficulty = useCallback(
    (diffId: DifficultyId, cost: number) => {
      const p = profileRef.current;
      if (p.devUnlocked || p.unlockedDiffs.includes(diffId)) return;
      if (p.orbs < cost) {
        audioEngine.playMiss(p.soundEnabled);
        return;
      }
      audioEngine.playLevelClear(p.soundEnabled);
      updateProfile((prev) => ({
        ...prev,
        orbs: prev.orbs - cost,
        unlockedDiffs: prev.unlockedDiffs.includes(diffId)
          ? prev.unlockedDiffs
          : [...prev.unlockedDiffs, diffId],
        selectedDifficulty: diffId,
      }));
    },
    [updateProfile],
  );

  const handleUnlockSong = useCallback(
    (songId: string, cost: number) => {
      const p = profileRef.current;
      if (p.devUnlocked || p.unlockedSongs.includes(songId)) return;
      if (p.orbs < cost) {
        audioEngine.playMiss(p.soundEnabled);
        return;
      }
      audioEngine.playLevelClear(p.soundEnabled);
      updateProfile((prev) => ({
        ...prev,
        orbs: prev.orbs - cost,
        unlockedSongs: prev.unlockedSongs.includes(songId)
          ? prev.unlockedSongs
          : [...prev.unlockedSongs, songId],
        selectedSongId: songId,
      }));
    },
    [updateProfile],
  );

  const handleUnlockTheme = useCallback(
    (themeId: ThemeId, cost: number) => {
      const p = profileRef.current;
      if (p.devUnlocked || p.unlockedThemes.includes(themeId)) return;
      if (p.orbs < cost) {
        audioEngine.playMiss(p.soundEnabled);
        return;
      }
      audioEngine.playLevelClear(p.soundEnabled);
      updateProfile((prev) => ({
        ...prev,
        orbs: prev.orbs - cost,
        unlockedThemes: prev.unlockedThemes.includes(themeId)
          ? prev.unlockedThemes
          : [...prev.unlockedThemes, themeId],
        theme: themeId,
      }));
    },
    [updateProfile],
  );

  // Per-Level Background Artwork & Dim/Blur Handlers
  const handleUpdateLevelBg = useCallback(
    (songId: string, patch: Partial<LevelBackgroundSetting>) => {
      updateProfile((prev) => {
        const cur = prev.levelBgSettings[songId] || { dimPct: 68, blurPx: 4 };
        return {
          ...prev,
          levelBgSettings: {
            ...prev.levelBgSettings,
            [songId]: { ...cur, ...patch },
          },
        };
      });
    },
    [updateProfile],
  );

  const handleResetLevelBg = useCallback(
    (songId: string) => {
      updateProfile((prev) => {
        const cur = prev.levelBgSettings[songId] || { dimPct: 68, blurPx: 4 };
        return {
          ...prev,
          levelBgSettings: {
            ...prev.levelBgSettings,
            [songId]: { dimPct: cur.dimPct, blurPx: cur.blurPx },
          },
        };
      });
    },
    [updateProfile],
  );

  // Newgrounds ID Lookup & Local Custom MP3 Loader (supports pairing onto curated NG tracks too!)
  const handleLookupNewgroundsId = useCallback(
    (ngId: string) => {
      const cleanId = ngId.trim();
      if (!cleanId) {
        setCustomAudioStatus('Enter a numeric Newgrounds Audio ID (e.g. 587069 or 1644660).');
        return;
      }
      const match = songsRef.current.find((s) => s.newgroundsId === cleanId);
      if (match) {
        const diffId: DifficultyId = match.chillOnly
          ? 'CHILL'
          : profileRef.current.selectedDifficulty;
        setMustChooseTrack(false);
        updateProfile({ selectedSongId: match.id, selectedDifficulty: diffId });
        setCustomAudioStatus(`Matched catalog Newgrounds track #${cleanId}: ${match.title}!`);
        if (screenRef.current === 'SONG_SELECT') {
          startSongPreview(match);
        } else {
          setPauseOpen(false);
          launchGameplay(match, diffId);
        }
        return;
      }

      setCustomAudioStatus(
        `NG #${cleanId} is external. Click "NG #${cleanId}" to grab it on Newgrounds, then drop the MP3 into "Import MP3" for beat-synced play!`,
      );
    },
    [launchGameplay, startSongPreview, updateProfile],
  );

  const handleUploadCustomAudio = useCallback(
    async (file: File, ngIdTag: string, targetSongId?: string) => {
      setCustomAudioStatus(`Decoding & beat-analyzing "${file.name}"...`);
      const songId = targetSongId || `custom_${Date.now()}`;
      const decoded = await audioEngine.decodeCustomFile(songId, file);
      if (!decoded) {
        setCustomAudioStatus('Failed to decode audio file. Please try an MP3, WAV, or OGG file.');
        return;
      }

      if (targetSongId) {
        const existing = songsRef.current.find((s) => s.id === targetSongId);
        if (existing) {
          const updated: SongDefinition = {
            ...existing,
            durationSec: decoded.durationSec,
            customOnsets: decoded.onsets,
            isCustom: true,
          };
          setSongs((prev) => prev.map((s) => (s.id === targetSongId ? updated : s)));
          setCustomAudioStatus(
            `Paired "${file.name}" onto ${existing.title} (${decoded.durationSec.toFixed(0)}s synced).`,
          );
          if (screenRef.current === 'SONG_SELECT') {
            startSongPreview(updated);
          }
          return;
        }
      }

      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      const defaultBg = songsRef.current[1]?.bgImageUrl || songsRef.current[0].bgImageUrl;
      const newSong: SongDefinition = {
        id: songId,
        num: String(songsRef.current.length).padStart(2, '0'),
        newgroundsId: ngIdTag || 'LOCAL',
        artist: 'Custom Newgrounds / Local',
        title: cleanTitle,
        genre: 'Auto-Analyzed Beatmap',
        bpm: decoded.estimatedBpm,
        keySig: 'AUTO',
        scaleNotes: [60, 62, 64, 67, 69, 72],
        durationSec: decoded.durationSec,
        audioUrl: '',
        bgImageUrl: defaultBg,
        orbCost: 0,
        chillOnly: false,
        isCustom: true,
        customOnsets: decoded.onsets,
        stars: { CHILL: '1.5★', NORMAL: '2.9★', HARD: '4.4★', INSANE: '5.8★', DEMON: '7.1★' },
        desc: `Beat-synced automatically from ${decoded.onsets.length} detected audio onsets at ~${decoded.estimatedBpm} BPM.`,
        sections: [
          { startPct: 0, label: 'INTRO' },
          { startPct: 0.16, label: 'BUILD-UP' },
          { startPct: 0.3, label: 'DROP' },
          { startPct: 0.62, label: 'BREAKDOWN' },
          { startPct: 0.76, label: 'DROP' },
          { startPct: 0.92, label: 'OUTRO' },
        ],
      };

      setSongs((prev) => [...prev, newSong]);
      setMustChooseTrack(false);
      updateProfile((prev) => ({
        ...prev,
        selectedSongId: songId,
        unlockedSongs: [...prev.unlockedSongs, songId],
      }));
      setCustomAudioStatus(
        `Loaded "${cleanTitle}" (${decoded.estimatedBpm} BPM, ${decoded.onsets.length} beats detected).`,
      );
      if (screenRef.current === 'SONG_SELECT') {
        startSongPreview(newSong);
      } else {
        setPauseOpen(false);
        launchGameplay(newSong, profileRef.current.selectedDifficulty);
      }
    },
    [launchGameplay, startSongPreview, updateProfile],
  );

  // Derived UI Values
  const activeSong = getActiveSong();
  const activeDifficulty = getEffectiveDifficulty(profile, activeSong);
  const streakMult = getStreakMultiplier(uiStreak);
  const totalMult = computeTotalMultiplier(activeDifficulty, profile.equippedMods, uiStreak);
  const modeMeta = getWaveModeMeta(uiWaveMode);
  const progressPct = Math.min(100, Math.max(0, (uiSongTime / Math.max(1, activeSong.durationSec)) * 100));
  const activeLevelBg = profile.levelBgSettings[activeSong.id];

  const promptHint = useMemo(() => {
    if (uiPhase === 'IDLE') {
      return `Press ${profile.trigger1Label}, ${profile.trigger2Label}, or click the dial to start ${activeSong.title}`;
    }
    if (uiPhase === 'PAUSED') return 'Paused · Resume or switch beatmaps anytime';
    if (uiSandboxMode) return `Field Sandbox · Testing ${modeMeta.name}`;
    if (uiIsTutorialRun) {
      return `Tutorial · Dial slows to highlight mechanics while music stays pure 1.0x (${uiTutorialLives} shields)`;
    }
    return `Strike the inner white core for PERFECT (+1 Orb) · ${profile.trigger1Label} / ${profile.trigger2Label}`;
  }, [
    activeSong.title,
    modeMeta.name,
    profile.trigger1Label,
    profile.trigger2Label,
    uiIsTutorialRun,
    uiPhase,
    uiSandboxMode,
    uiTutorialLives,
  ]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#050608] text-[#f3f4f6]">
      {/* Per-Song Matching Artwork Backdrop + Dim/Blur + Retro Arcade Grid */}
      <BackgroundBackdrop
        defaultImageUrl={activeSong.bgImageUrl}
        levelSetting={activeLevelBg}
        bgFxMode={profile.bgFxMode}
        forceDimPct={screen === 'TITLE' ? 62 : screen === 'SONG_SELECT' ? 40 : undefined}
        forceBlurPx={screen === 'TITLE' ? 3 : screen === 'SONG_SELECT' ? 2 : undefined}
      />

      {screen === 'TITLE' && (
        <TitleScreen
          profile={profile}
          activeSong={activeSong}
          onPlayPrimary={() => {
            const p = profileRef.current;
            if (!p.tutorialSongCompleted) {
              const tutSong = songs.find((s) => s.id === 'moments_passing') || songs[0];
              updateProfile({
                selectedSongId: 'moments_passing',
                selectedDifficulty: 'CHILL',
              });
              launchWithZoomWarp(tutSong, 'CHILL', 'TUTORIAL CALIBRATION');
              return;
            }
            const s = getActiveSong(p);
            const d = getEffectiveDifficulty(p, s);
            const songOk = p.devUnlocked || p.unlockedSongs.includes(s.id);
            const diffOk = p.devUnlocked || p.unlockedDiffs.includes(d);
            if (!songOk || !diffOk) {
              enterSongSelect();
              return;
            }
            launchWithZoomWarp(s, d, s.title);
          }}
          onEnterSongSelect={enterSongSelect}
          onOpenOrbVault={openOrbVault}
          onOpenSettings={() => openPause('ctrl')}
          onOpenIndex={() => openPause('index')}
          onToggleMusic={() => {
            const next = !profile.musicEnabled;
            updateProfile({ musicEnabled: next });
            audioEngine.updateVolumes(next, profile.musicVolume, profile.soundEnabled, profile.sfxVolume);
          }}
          onHoverTick={() => audioEngine.playUiTick(profileRef.current.soundEnabled)}
        />
      )}

      {screen === 'SONG_SELECT' && (
        <SongSelectScreen
          profile={profile}
          songs={songs}
          customAudioStatus={customAudioStatus}
          onBackToTitle={returnToTitle}
          onPreviewSong={(songId) => {
            const song = songs.find((s) => s.id === songId) || songs[0];
            updateProfile({ selectedSongId: songId });
            startSongPreview(song);
          }}
          onRandomSong={() => {
            const unlockedPool = songs.filter(
              (s) =>
                s.id !== activeSong.id &&
                (profile.devUnlocked || profile.unlockedSongs.includes(s.id)),
            );
            const pool = unlockedPool.length > 0 ? unlockedPool : songs;
            const pick = pool[Math.floor(Math.random() * pool.length)] || songs[0];
            updateProfile({ selectedSongId: pick.id });
            startSongPreview(pick);
          }}
          onToggleMusic={() => {
            const next = !profile.musicEnabled;
            updateProfile({ musicEnabled: next });
            audioEngine.updateVolumes(next, profile.musicVolume, profile.soundEnabled, profile.sfxVolume);
            if (next) startSongPreview(activeSong, { ...profile, musicEnabled: true });
            else audioEngine.stop();
          }}
          onSelectDifficulty={(diffId) => {
            updateProfile({ selectedDifficulty: diffId });
          }}
          onStartGame={() => {
            const songUnlocked = profile.devUnlocked || profile.unlockedSongs.includes(activeSong.id);
            const diffUnlocked = profile.devUnlocked || profile.unlockedDiffs.includes(activeDifficulty);
            if (!songUnlocked || !diffUnlocked) {
              openOrbVault();
              return;
            }
            launchWithZoomWarp(activeSong, activeDifficulty, activeSong.title);
          }}
          onOpenMods={openMods}
          onOpenOrbVault={openOrbVault}
          onUnlockDifficulty={handleUnlockDifficulty}
          onUnlockSong={handleUnlockSong}
          onUpdateLevelBg={handleUpdateLevelBg}
          onResetLevelBg={handleResetLevelBg}
          onLookupNewgroundsId={handleLookupNewgroundsId}
          onUploadCustomAudio={handleUploadCustomAudio}
        />
      )}

      {screen === 'PLAYING' && (
        <div className="relative z-10 grid h-dvh w-full grid-rows-[52px_1fr]">
          <TopBar
            activeSong={activeSong}
            activeDifficulty={activeDifficulty}
            unlockedDiffs={profile.unlockedDiffs}
            devUnlocked={profile.devUnlocked}
            equippedModsCount={profile.equippedMods.length}
            orbs={profile.orbs}
            beatLedIndex={uiBeatLed}
            songTimerText={`${formatTimeSec(uiSongTime)} / ${formatTimeSec(activeSong.durationSec)} · ${uiSection}`}
            songProgressPct={progressPct}
            onBackToSongSelect={enterSongSelect}
            onSelectDifficulty={(diffId) => {
              updateProfile({ selectedDifficulty: diffId });
              resetRound(engineRef.current.phase === 'PLAYING', null, activeSong, diffId);
            }}
            onOpenOrbVault={openOrbVault}
            onOpenMods={openMods}
            onOpenPause={() => openPause('main')}
          />

          <OrbitStage
            renderStateRef={canvasStateRef}
            phase={uiPhase}
            themeId={profile.theme}
            bgFxMode={profile.bgFxMode}
            allowPointerTap={profile.allowPointerTap}
            onTriggerTap={handleTriggerAction}
            songTimerText={`${formatTimeSec(uiSongTime)} / ${formatTimeSec(activeSong.durationSec)} · ${uiSection}`}
            score={uiScore}
            streak={uiStreak}
            bestScore={profile.songRecords[activeSong.id]?.bestScore || 0}
            unbankedOrbs={uiUnbankedOrbs}
            streakMult={streakMult}
            totalMult={totalMult}
            modeName={modeMeta.name}
            modeColor={modeMeta.color}
            shields={uiShields}
            isTutorialRun={uiIsTutorialRun}
            tutorialLives={uiTutorialLives}
            activeLesson={uiActiveLesson}
            showTutorialCompleteStripe={showTutorialCompleteStripe}
            promptHint={promptHint}
            trigger1Code={profile.trigger1Code}
            trigger1Label={profile.trigger1Label}
            trigger2Code={profile.trigger2Code}
            trigger2Label={profile.trigger2Label}
            onSkipTutorial={() => {
              const eng = engineRef.current;
              eng.tutorialGuideDisabled = true;
              eng.lessonSlowActive = false;
              eng.activeLesson = null;
              eng.dialTimeScale = 1.0;
              setUiActiveLesson(null);
            }}
          />
        </div>
      )}

      {/* Opaque Backdrop Scrim for Slide-Over / Bottom Drawers */}
      {(pauseOpen || modsOpen) && (
        <div
          aria-hidden="true"
          onClick={() => {
            if (modsOpen) closeMods();
            else closePause(false);
          }}
          className="fixed inset-0 z-40 bg-black/75"
        />
      )}

      <PausePanel
        open={pauseOpen}
        activeTab={pauseTab}
        onChangeTab={setPauseTab}
        mustChooseTrack={mustChooseTrack}
        profile={profile}
        songs={songs}
        listeningSlot={listeningSlot}
        onStartRebind={(slot) => setListeningSlot(slot)}
        onResume={() => closePause(false)}
        onGoToSongSelect={enterSongSelect}
        onGoToTitle={returnToTitle}
        onOpenOrbVault={openOrbVault}
        onSelectTrack={(songId, diffId) => {
          const targetSong = songs.find((s) => s.id === songId) || songs[0];
          setMustChooseTrack(false);
          updateProfile({ selectedSongId: songId, selectedDifficulty: diffId });
          launchGameplay(targetSong, diffId);
        }}
        onLookupNewgroundsId={handleLookupNewgroundsId}
        onUploadCustomAudio={handleUploadCustomAudio}
        customAudioStatus={customAudioStatus}
        onTogglePointer={() => updateProfile((p) => ({ ...p, allowPointerTap: !p.allowPointerTap }))}
        onReplayTutorial={() => {
          setMustChooseTrack(false);
          const tutSong = songs.find((s) => s.id === 'moments_passing') || songs[0];
          updateProfile({
            tutorialSongCompleted: false,
            selectedSongId: 'moments_passing',
            selectedDifficulty: 'CHILL',
          });
          launchGameplay(tutSong, 'CHILL');
        }}
        onUpdateAudioOffset={(ms) => updateProfile({ audioOffsetMs: ms })}
        onToggleMusic={() => {
          const next = !profile.musicEnabled;
          updateProfile({ musicEnabled: next });
          audioEngine.updateVolumes(next, profile.musicVolume, profile.soundEnabled, profile.sfxVolume);
          if (screenRef.current === 'SONG_SELECT') {
            if (next) startSongPreview(activeSong, { ...profile, musicEnabled: true });
            else audioEngine.stop();
          }
        }}
        onMusicVolume={(vol) => {
          updateProfile({ musicVolume: vol });
          audioEngine.updateVolumes(profile.musicEnabled, vol, profile.soundEnabled, profile.sfxVolume);
        }}
        onToggleSound={() => {
          const next = !profile.soundEnabled;
          updateProfile({ soundEnabled: next });
          audioEngine.updateVolumes(profile.musicEnabled, profile.musicVolume, next, profile.sfxVolume);
          if (next) audioEngine.playHit(true, profile.hitSfxMode, 1, true, activeSong.scaleNotes);
        }}
        onSfxVolume={(vol) => {
          updateProfile({ sfxVolume: vol });
          audioEngine.updateVolumes(profile.musicEnabled, profile.musicVolume, profile.soundEnabled, vol);
        }}
        onSelectHitSfx={(mode: HitSfxMode) => {
          updateProfile({ hitSfxMode: mode, soundEnabled: true });
          audioEngine.playHit(true, mode, 1, true, activeSong.scaleNotes);
        }}
        onSelectTheme={(theme: ThemeId) => {
          updateProfile({ theme });
          audioEngine.playHit(profile.soundEnabled, profile.hitSfxMode, 2, false, activeSong.scaleNotes);
        }}
        onSelectBgFx={(mode: BgFxMode) => updateProfile({ bgFxMode: mode })}
        onDevUnlock={(code) => {
          if (code !== DEV_PASSCODE) {
            audioEngine.playMiss(profile.soundEnabled);
            return false;
          }
          setMustChooseTrack(false);
          updateProfile({
            devUnlocked: true,
            unlockedDiffs: [...DIFFICULTY_ORDER],
            unlockedSongs: songs.map((s) => s.id),
            unlockedThemes: Object.keys(CHASSIS_THEMES) as ThemeId[],
            tutorialSongCompleted: true,
          });
          audioEngine.playLevelClear(profile.soundEnabled);
          return true;
        }}
        onResetCareer={() => {
          updateProfile((prev) => ({
            ...prev,
            orbs: 0,
            totalOrbsEarned: 0,
            bestScore: 0,
            tierBestScores: { CHILL: 0, NORMAL: 0, HARD: 0, INSANE: 0, DEMON: 0 },
            songRecords: {},
            bestStreak: 0,
            totalHits: 0,
            totalMisses: 0,
            totalPerfects: 0,
            offsetDegSum: 0,
            earlyMisses: 0,
            lateMisses: 0,
          }));
        }}
        onResetDefaults={() => {
          updateProfile((prev) => ({
            ...prev,
            trigger1Code: INITIAL_PROFILE.trigger1Code,
            trigger1Label: INITIAL_PROFILE.trigger1Label,
            trigger2Code: INITIAL_PROFILE.trigger2Code,
            trigger2Label: INITIAL_PROFILE.trigger2Label,
            allowPointerTap: INITIAL_PROFILE.allowPointerTap,
            musicEnabled: INITIAL_PROFILE.musicEnabled,
            musicVolume: INITIAL_PROFILE.musicVolume,
            soundEnabled: INITIAL_PROFILE.soundEnabled,
            sfxVolume: INITIAL_PROFILE.sfxVolume,
            hitSfxMode: INITIAL_PROFILE.hitSfxMode,
            audioOffsetMs: INITIAL_PROFILE.audioOffsetMs,
            bgFxMode: INITIAL_PROFILE.bgFxMode,
            theme: INITIAL_PROFILE.theme,
            equippedMods: [],
          }));
        }}
        onTestWaveSandbox={(modeId) => {
          setMustChooseTrack(false);
          setPauseOpen(false);
          setScreen('PLAYING');
          resetRound(true, modeId);
        }}
      />

      <ModDrawer
        open={modsOpen}
        equippedMods={profile.equippedMods}
        totalHits={profile.totalHits}
        devUnlocked={profile.devUnlocked}
        activeDifficulty={activeDifficulty}
        onToggleMod={(code) => {
          const cur = profile.equippedMods;
          const next = cur.includes(code)
            ? cur.filter((c) => c !== code)
            : cur.length < 3
            ? [...cur, code]
            : cur;
          updateProfile({ equippedMods: next });
        }}
        onClearMods={() => updateProfile({ equippedMods: [] })}
        onClose={closeMods}
      />

      <OrbShopModal
        open={orbShopOpen}
        profile={profile}
        songs={songs}
        onUnlockDifficulty={handleUnlockDifficulty}
        onUnlockSong={handleUnlockSong}
        onUnlockTheme={handleUnlockTheme}
        onEquipTheme={(themeId) => {
          updateProfile({ theme: themeId });
          audioEngine.playHit(profile.soundEnabled, profile.hitSfxMode, 2, true, activeSong.scaleNotes);
        }}
        onClose={closeOrbVault}
      />

      <RunSummaryModal
        summary={uiPhase === 'SUMMARY' ? summaryData : null}
        onRetry={() => resetRound(true, engineRef.current.sandboxModeId)}
        onOpenSongSelect={enterSongSelect}
        onOpenOrbVault={() => {
          setSummaryData(null);
          openOrbVault();
        }}
      />

      <ZoomWarpTransition
        active={Boolean(warpLaunchLabel)}
        label={warpLaunchLabel || ''}
      />
    </div>
  );
}
