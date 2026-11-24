import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from './audio/audioEngine';
import { ModDrawer } from './components/ModDrawer';
import { CanvasRenderState, getWaveModeMeta, OrbitStage } from './components/OrbitStage';
import { PausePanel } from './components/PausePanel';
import { RunSummaryModal } from './components/RunSummaryModal';
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
  computeLetterRank,
  computeTotalMultiplier,
  formatTimeSec,
  getSectionAtProgress,
  getStreakMultiplier,
  signedAngleDiff,
  wrapAngle,
} from './engine/beatmap';
import { INITIAL_PROFILE, loadProfile, saveProfile } from './store/profileStore';
import {
  BeatmapNote,
  BgFxMode,
  DifficultyId,
  GamePhase,
  HitSfxMode,
  ModCode,
  PauseTabId,
  PlayerProfile,
  RunSummaryData,
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
  // Tutorial & Cinematic
  isTutorialRun: boolean;
  tutorialLives: number;
  shownLessonIds: Set<string>;
  activeLesson: TutorialLesson | null;
  lessonSlowActive: boolean;
  tutorialGuideDisabled: boolean;
  timeScale: number;
  cinematicTimer: number;
  dialVisualAlpha: number;
  dialSpinBoost: number;
  sandboxModeId: WaveModeId | null;
  beatPulse: number;
  activeBeatLed: number;
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
  const [customAudioStatus, setCustomAudioStatus] = useState('');

  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseTab, setPauseTab] = useState<PauseTabId>('main');
  const [modsOpen, setModsOpen] = useState(false);
  const [mustChooseTrack, setMustChooseTrack] = useState(false);
  const [listeningSlot, setListeningSlot] = useState<0 | 1 | 2>(0);
  const [summaryData, setSummaryData] = useState<RunSummaryData | null>(null);
  const [showTutorialCompleteStripe, setShowTutorialCompleteStripe] = useState(false);

  // React UI state synced cleanly when discrete events happen (not 60fps!)
  const [uiScore, setUiScore] = useState(0);
  const [uiStreak, setUiStreak] = useState(0);
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
  const pauseOpenRef = useRef(pauseOpen);
  pauseOpenRef.current = pauseOpen;
  const modsOpenRef = useRef(modsOpen);
  modsOpenRef.current = modsOpen;
  const phaseBeforeOverlayRef = useRef<GamePhase>('IDLE');

  const engineRef = useRef<RuntimeEngine>({
    phase: 'IDLE',
    score: 0,
    streak: 0,
    maxStreakInRun: 0,
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
    isTutorialRun: false,
    tutorialLives: 3,
    shownLessonIds: new Set<string>(),
    activeLesson: null,
    lessonSlowActive: false,
    tutorialGuideDisabled: false,
    timeScale: 1.0,
    cinematicTimer: 0,
    dialVisualAlpha: 1,
    dialSpinBoost: 0,
    sandboxModeId: null,
    beatPulse: 0,
    activeBeatLed: -1,
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
    hubStatusText: 'READY',
    hubStatusColor: null,
    hubStatusTimer: 0,
    shakeX: 0,
    missDegrees: '0.0',
    missNearestEdge: 0,
    missSignedSpan: 0,
    dialVisualAlpha: 1,
    bassEnergy: 0,
    beatPulse: 0,
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
  }, [profile.theme]);

  // Persist profile updates
  const updateProfile = useCallback((updater: Partial<PlayerProfile> | ((p: PlayerProfile) => PlayerProfile)) => {
    setProfile((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveProfile(next);
      return next;
    });
  }, []);

  const getActiveSong = useCallback(
    (p: PlayerProfile = profileRef.current, list: SongDefinition[] = songsRef.current) => {
      return list.find((s) => s.id === p.selectedSongId) || list[0];
    },
    [],
  );

  const getEffectiveDifficulty = useCallback((p: PlayerProfile = profileRef.current, song?: SongDefinition) => {
    const s = song || getActiveSong(p);
    if (s.chillOnly) return 'CHILL' as DifficultyId;
    return p.selectedDifficulty;
  }, [getActiveSong]);

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
      if (mods.includes('DT')) speed *= 1.25;
      if (modeId === 'PURPLE_SURGE') speed *= 1.42;
      return Math.max(1.25, Math.min(7.8, speed));
    },
    [],
  );

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
      const avgOffsetDeg = eng.runHitCount > 0 ? eng.runOffsetDegSum / eng.runHitCount : 0;

      const prevRec = p.songRecords[song.id];
      const isNewBest = !prevRec || eng.score > prevRec.bestScore;

      let unlockedTier: DifficultyId | null = null;
      const nextUnlocked = new Set(p.unlockedDiffs);
      if (cleared) {
        const curIdx = DIFFICULTY_ORDER.indexOf(diffId);
        if (curIdx >= 0 && curIdx + 1 < DIFFICULTY_ORDER.length) {
          const nextId = DIFFICULTY_ORDER[curIdx + 1];
          if (!nextUnlocked.has(nextId)) {
            nextUnlocked.add(nextId);
            unlockedTier = nextId;
          }
        }
      }

      const rankOrder = ['SS', 'S', 'A', 'B', 'C', 'D'];
      const bestRank =
        prevRec && rankOrder.indexOf(prevRec.bestRank) < rankOrder.indexOf(rank)
          ? prevRec.bestRank
          : rank;

      const nextRecords = {
        ...p.songRecords,
        [song.id]: {
          bestScore: Math.max(prevRec?.bestScore || 0, eng.score),
          bestRank,
          bestAccuracy: Math.max(prevRec?.bestAccuracy || 0, accuracy),
          bestCombo: Math.max(prevRec?.bestCombo || 0, eng.maxStreakInRun),
        },
      };

      const nextTierBests = { ...p.tierBestScores };
      if (eng.score > (nextTierBests[diffId] || 0)) {
        nextTierBests[diffId] = eng.score;
      }

      // Special First-Run Tutorial Completion Cinematic!
      if (cleared && song.id === 'moments_passing' && !p.tutorialSongCompleted && !eng.sandboxModeId) {
        audioEngine.playLevelClear(p.soundEnabled);
        nextUnlocked.add('NORMAL');
        updateProfile({
          tutorialSongCompleted: true,
          unlockedDiffs: Array.from(nextUnlocked),
          songRecords: nextRecords,
          tierBestScores: nextTierBests,
          bestScore: Math.max(p.bestScore, eng.score),
          bestStreak: Math.max(p.bestStreak, eng.maxStreakInRun),
          selectedSongId: 'play_aliens',
          selectedDifficulty: 'NORMAL',
        });

        eng.phase = 'TUTORIAL_CINEMATIC';
        eng.cinematicTimer = 0;
        eng.activeLesson = null;
        eng.lessonSlowActive = false;
        setUiActiveLesson(null);
        setUiPhase('TUTORIAL_CINEMATIC');
        setMustChooseTrack(true);
        return;
      }

      if (cleared) {
        audioEngine.playLevelClear(p.soundEnabled);
      }

      updateProfile({
        unlockedDiffs: Array.from(nextUnlocked),
        songRecords: nextRecords,
        tierBestScores: nextTierBests,
        bestScore: Math.max(p.bestScore, eng.score),
        bestStreak: Math.max(p.bestStreak, eng.maxStreakInRun),
      });

      eng.phase = 'SUMMARY';
      setUiPhase('SUMMARY');
      setSummaryData({
        cleared,
        songId: song.id,
        songTitle: song.title,
        artist: song.artist,
        difficulty: diffId,
        score: eng.score,
        maxCombo: eng.maxStreakInRun,
        accuracy,
        rank,
        perfectCount: eng.perfectCount,
        greatCount: eng.greatCount,
        goodCount: eng.goodCount,
        missCount: eng.missCount,
        avgOffsetDeg,
        missReason: cleared ? undefined : eng.missReason,
        missDegrees: cleared ? undefined : eng.missDegrees,
        isNewBest,
        unlockedTier,
      });
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
      const minOff = modeId === 'CASCADE_CHAIN' ? 1.15 : isFirstNote ? 1.65 : 1.45;
      const maxOff = modeId === 'CASCADE_CHAIN' ? 1.85 : 4.65;
      const primaryOffset = minOff + Math.random() * (maxOff - minOff);
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
    (autoStart: boolean, sandboxMode: WaveModeId | null = null, songOverride?: SongDefinition, diffOverride?: DifficultyId) => {
      const p = profileRef.current;
      const song = songOverride || getActiveSong(p);
      const diffId = diffOverride || getEffectiveDifficulty(p, song);
      const eng = engineRef.current;

      setSummaryData(null);
      setShowTutorialCompleteStripe(false);

      eng.sandboxModeId = sandboxMode;
      eng.isTutorialRun = song.id === 'moments_passing' && !p.tutorialSongCompleted && !sandboxMode;
      eng.tutorialLives = 3;
      eng.shownLessonIds = new Set<string>();
      eng.activeLesson = null;
      eng.lessonSlowActive = false;
      eng.tutorialGuideDisabled = false;
      eng.timeScale = p.equippedMods.includes('DT') ? 1.25 : 1.0;

      eng.score = 0;
      eng.streak = 0;
      eng.maxStreakInRun = 0;
      eng.shields = 0;
      eng.direction = 1;
      eng.spinnerAngle = -Math.PI / 2;
      eng.waveIndex = 0;
      eng.songTime = 0;
      eng.songSection = 'INTRO';
      eng.hitEffects = [];
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

      eng.beatmap = buildSongBeatmap(song, diffId, p.equippedMods);
      eng.beatmapIndex = 0;
      eng.phase = autoStart ? 'PLAYING' : 'IDLE';

      setUiScore(0);
      setUiStreak(0);
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
        const rate = p.equippedMods.includes('DT') ? 1.25 : 1.0;
        audioEngine
          .startAtOffset(
            song,
            0,
            rate,
            p.musicEnabled,
            p.musicVolume,
            p.soundEnabled,
            p.sfxVolume,
            Boolean(sandboxMode),
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

  // Initial round setup + preload active song buffer
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerMiss = useCallback(
    (reasonText: string, targetRef?: TargetSector) => {
      const eng = engineRef.current;
      const p = profileRef.current;

      // Clear slow-mo if active
      if (eng.lessonSlowActive) {
        eng.lessonSlowActive = false;
        eng.activeLesson = null;
        eng.timeScale = p.equippedMods.includes('DT') ? 1.25 : 1.0;
        audioEngine.setPlaybackRate(eng.timeScale);
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

        updateProfile((prev) => ({
          ...prev,
          totalMisses: prev.totalMisses + 1,
          earlyMisses: prev.earlyMisses + (isEarly ? 1 : 0),
          lateMisses: prev.lateMisses + (isEarly ? 0 : 1),
        }));
      }

      eng.missReason = reasonText;
      eng.shakeTime = 0.34;
      eng.shakeAmplitude = 11;
      finalizeRunSummary(false);
    },
    [finalizeRunSummary, spawnNextWave, updateProfile],
  );

  const handleTriggerAction = useCallback(() => {
    if (pauseOpenRef.current || modsOpenRef.current) return;
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

    // Resume normal tempo if we were in a slow-motion tutorial lesson!
    if (eng.lessonSlowActive) {
      eng.lessonSlowActive = false;
      eng.activeLesson = null;
      eng.timeScale = p.equippedMods.includes('DT') ? 1.25 : 1.0;
      audioEngine.setPlaybackRate(eng.timeScale);
      setUiActiveLesson(null);
    }

    const ratio = bestAbsDelta / Math.max(0.01, hitTarget.halfWidth);
    const isPerfect = ratio <= 0.24;
    const isGreat = !isPerfect && ratio <= 0.62;
    const tierLabel = isPerfect ? 'PERFECT' : isGreat ? 'GREAT' : 'GOOD';
    const basePts = isPerfect ? 300 : isGreat ? 150 : 75;
    const fxColor = isPerfect ? '#ffffff' : isGreat ? '#34d399' : '#38bdf8';

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

    const mult = computeTotalMultiplier(diffId, p.equippedMods, eng.streak);
    const pts = Math.max(10, Math.round(basePts * mult));
    eng.score += pts;

    if (isPerfect) eng.perfectCount += 1;
    else if (isGreat) eng.greatCount += 1;
    else eng.goodCount += 1;

    const offsetDeg = bestAbsDelta * (180 / Math.PI);
    eng.runOffsetDegSum += offsetDeg;
    eng.runHitCount += 1;

    if (p.equippedMods.includes('SH') && eng.streak % 12 === 0 && eng.shields < 2) {
      eng.shields += 1;
      setUiShields(eng.shields);
    }

    audioEngine.playHit(p.soundEnabled, p.hitSfxMode, eng.streak, isPerfect, song.scaleNotes);
    eng.hitEffects.push({
      timer: 0.36,
      duration: 0.36,
      angle: eng.spinnerAngle,
      isPerfect,
      label: `${tierLabel} +${pts}`,
      color: fxColor,
    });
    if (eng.hitEffects.length > 5) eng.hitEffects.shift();

    eng.hubStatusText = tierLabel;
    eng.hubStatusColor = fxColor;
    eng.hubStatusTimer = 0.42;

    setUiScore(eng.score);
    setUiStreak(eng.streak);

    updateProfile((prev) => ({
      ...prev,
      totalHits: prev.totalHits + 1,
      totalPerfects: prev.totalPerfects + (isPerfect ? 1 : 0),
      offsetDegSum: prev.offsetDegSum + offsetDeg,
    }));

    if (eng.targets.length > 0) return;

    eng.waveIndex += 1;
    spawnNextWave(false, eng.sandboxModeId);
  }, [
    getActiveSong,
    getEffectiveDifficulty,
    resetRound,
    spawnNextWave,
    triggerMiss,
    updateProfile,
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

      // Update transient VFX
      for (let i = eng.hitEffects.length - 1; i >= 0; i--) {
        eng.hitEffects[i].timer -= dt;
        if (eng.hitEffects[i].timer <= 0) eng.hitEffects.splice(i, 1);
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

      // Beat telemetry LEDs
      eng.beatPulse = Math.max(0, eng.beatPulse - dt * 4.5);
      const bpm = song.bpm * (p.equippedMods.includes('DT') ? 1.25 : 1.0);
      const tRef = eng.songTime > 0 ? eng.songTime : now / 1000;
      const ledIdx = Math.floor(tRef / (60 / Math.max(60, bpm))) % 4;
      if (ledIdx !== eng.activeBeatLed) {
        eng.activeBeatLed = ledIdx;
        eng.beatPulse = 0.85;
        setUiBeatLed(ledIdx);
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
        setShowTutorialCompleteStripe(stripeActive);
        eng.spinnerAngle = wrapAngle(eng.spinnerAngle + (eng.angularSpeed + eng.dialSpinBoost) * dt);

        if (t >= 2.75) {
          setShowTutorialCompleteStripe(false);
          eng.dialVisualAlpha = 1;
          eng.dialSpinBoost = 0;
          resetRound(false, null);
          setPauseTab('tracks');
          setPauseOpen(true);
        }
      } else if (eng.phase === 'PLAYING') {
        // Advance song timer synchronized to audio clock + user latency offset
        const audioClock = audioEngine.syncClock();
        const offsetSec = p.audioOffsetMs / 1000;
        if (audioClock !== null && !eng.sandboxModeId) {
          eng.songTime = Math.max(0, audioClock + offsetSec);
        } else {
          eng.songTime += dt * eng.timeScale;
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
          // In-Song Slow-Motion Tutorial Checkpoints during first run of Moments Passing Us
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
                eng.timeScale = 0.35;
                audioEngine.setPlaybackRate(0.35);
                audioEngine.playLessonSlowCue(p.soundEnabled);
                setUiActiveLesson(nextLesson);
              }
            }
          }

          const targetRate = eng.lessonSlowActive
            ? 0.35
            : p.equippedMods.includes('DT')
            ? 1.25
            : 1.0;
          eng.timeScale += (targetRate - eng.timeScale) * Math.min(1, dt * 8);

          const simDt = dt * (eng.lessonSlowActive ? 0.35 : 1.0);
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

          // Fixed Multi-Target ONE-PASS Check (per-target window tracking)
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
      cs.beatPulse = eng.beatPulse;
      cs.songSection = eng.songSection;
      cs.lessonSlowActive = eng.lessonSlowActive;
      cs.activeLesson = eng.activeLesson;

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [finalizeRunSummary, getActiveSong, resetRound, triggerMiss]);

  // Overlay Management
  const openPause = useCallback((tab: PauseTabId = 'main') => {
    setModsOpen(false);
    if (!pauseOpenRef.current) {
      phaseBeforeOverlayRef.current = engineRef.current.phase;
      if (engineRef.current.phase === 'PLAYING') {
        engineRef.current.phase = 'PAUSED';
        setUiPhase('PAUSED');
        audioEngine.stop();
      }
    }
    setPauseTab(tab);
    setPauseOpen(true);
  }, []);

  const closePause = useCallback(
    (startSelectedSong = false) => {
      if (mustChooseTrack && !startSelectedSong) {
        setPauseTab('tracks');
        return;
      }
      setListeningSlot(0);
      setPauseOpen(false);

      if (startSelectedSong) {
        resetRound(true, null);
        return;
      }

      if (phaseBeforeOverlayRef.current === 'PLAYING') {
        const eng = engineRef.current;
        const p = profileRef.current;
        const song = getActiveSong(p);
        eng.phase = 'PLAYING';
        setUiPhase('PLAYING');
        audioEngine.startAtOffset(
          song,
          eng.songTime,
          eng.timeScale,
          p.musicEnabled,
          p.musicVolume,
          p.soundEnabled,
          p.sfxVolume,
          Boolean(eng.sandboxModeId),
        );
      }
    },
    [getActiveSong, mustChooseTrack, resetRound],
  );

  const openMods = useCallback(() => {
    setPauseOpen(false);
    if (!modsOpenRef.current) {
      phaseBeforeOverlayRef.current = engineRef.current.phase;
      if (engineRef.current.phase === 'PLAYING') {
        engineRef.current.phase = 'PAUSED';
        setUiPhase('PAUSED');
        audioEngine.stop();
      }
    }
    setModsOpen(true);
  }, []);

  const closeMods = useCallback(() => {
    setModsOpen(false);
    if (phaseBeforeOverlayRef.current === 'PLAYING') {
      const eng = engineRef.current;
      const p = profileRef.current;
      const song = getActiveSong(p);
      eng.phase = 'PLAYING';
      setUiPhase('PLAYING');
      audioEngine.startAtOffset(
        song,
        eng.songTime,
        eng.timeScale,
        p.musicEnabled,
        p.musicVolume,
        p.soundEnabled,
        p.sfxVolume,
        Boolean(eng.sandboxModeId),
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
        if (modsOpenRef.current) closeMods();
        else if (pauseOpenRef.current) closePause(false);
        else openPause('main');
        return;
      }

      if (pauseOpenRef.current || modsOpenRef.current) return;

      // Ignore triggers if user is typing inside an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const p = profileRef.current;
      if (e.code === p.trigger1Code || e.code === p.trigger2Code) {
        e.preventDefault();
        handleTriggerAction();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeMods, closePause, getActiveSong, handleTriggerAction, listeningSlot, openPause, updateProfile]);

  // Newgrounds ID Lookup & Local Custom MP3 Loader
  const handleLookupNewgroundsId = useCallback(
    (ngId: string) => {
      const cleanId = ngId.trim();
      if (!cleanId) {
        setCustomAudioStatus('Enter a numeric Newgrounds Audio ID (e.g. 1644660).');
        return;
      }
      const match = songsRef.current.find((s) => s.newgroundsId === cleanId);
      if (match) {
        const diffId: DifficultyId = match.chillOnly
          ? 'CHILL'
          : profileRef.current.selectedDifficulty;
        setMustChooseTrack(false);
        updateProfile({ selectedSongId: match.id, selectedDifficulty: diffId });
        setCustomAudioStatus(`Matched bundled Newgrounds track #${cleanId}: ${match.title}!`);
        setPauseOpen(false);
        resetRound(true, null, match, diffId);
        return;
      }

      setCustomAudioStatus(
        `NG #${cleanId} is external. Click "NG #${cleanId}" to open/download it on Newgrounds, then drop the MP3 into "Load Local MP3 / OGG" for offline beat-synced play!`,
      );
    },
    [resetRound, updateProfile],
  );

  const handleUploadCustomAudio = useCallback(
    async (file: File, ngIdTag: string) => {
      setCustomAudioStatus(`Decoding & beat-analyzing "${file.name}"...`);
      const customId = `custom_${Date.now()}`;
      const decoded = await audioEngine.decodeCustomFile(customId, file);
      if (!decoded) {
        setCustomAudioStatus('Failed to decode audio file. Please try an MP3, WAV, or OGG file.');
        return;
      }

      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      const newSong: SongDefinition = {
        id: customId,
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
        chillOnly: false,
        isCustom: true,
        customOnsets: decoded.onsets,
        stars: { CHILL: '1.5★', NORMAL: '2.9★', HARD: '4.4★', INSANE: '5.8★', DEMON: '7.1★' },
        desc: `Beat-synced automatically from ${decoded.onsets.length} detected audio onsets at ~${decoded.estimatedBpm} BPM.`,
        sections: [
          { startPct: 0, label: 'INTRO' },
          { startPct: 0.16, label: 'BUILD-UP' },
          { startPct: 0.30, label: 'DROP' },
          { startPct: 0.62, label: 'BREAKDOWN' },
          { startPct: 0.76, label: 'DROP' },
          { startPct: 0.92, label: 'OUTRO' },
        ],
      };

      setSongs((prev) => [...prev, newSong]);
      setMustChooseTrack(false);
      updateProfile({ selectedSongId: customId });
      setCustomAudioStatus(
        `Loaded "${cleanTitle}" (${decoded.estimatedBpm} BPM, ${decoded.onsets.length} beats detected).`,
      );
      setPauseOpen(false);
      resetRound(true, null, newSong, profileRef.current.selectedDifficulty);
    },
    [resetRound, updateProfile],
  );

  // Derived UI Values
  const activeSong = getActiveSong();
  const activeDifficulty = getEffectiveDifficulty(profile, activeSong);
  const star = activeSong.stars[activeDifficulty] || activeSong.stars.CHILL || '1.2★';
  const streakMult = getStreakMultiplier(uiStreak);
  const totalMult = computeTotalMultiplier(activeDifficulty, profile.equippedMods, uiStreak);
  const modeMeta = getWaveModeMeta(uiWaveMode);
  const progressPct = Math.min(100, Math.max(0, (uiSongTime / Math.max(1, activeSong.durationSec)) * 100));

  const promptHint = useMemo(() => {
    if (uiPhase === 'IDLE') {
      return `Press ${profile.trigger1Label}, ${profile.trigger2Label}, or click the dial to start ${activeSong.title}`;
    }
    if (uiPhase === 'PAUSED') return 'Paused · Select a track or click Resume';
    if (uiSandboxMode) return `Field Sandbox · Testing ${modeMeta.name}`;
    if (uiIsTutorialRun) {
      return `Tutorial Track · Time slows on new mechanics to guide you (${uiTutorialLives} shields)`;
    }
    return `Strike on the beat with ${profile.trigger1Label} or ${profile.trigger2Label}`;
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
    <div className="grid h-dvh w-full grid-rows-[54px_1fr] bg-[#050608] text-[#f3f4f6]">
      <TopBar
        activeSong={activeSong}
        activeDifficulty={activeDifficulty}
        unlockedDiffs={profile.unlockedDiffs}
        devUnlocked={profile.devUnlocked}
        equippedModsCount={profile.equippedMods.length}
        totalMultiplier={totalMult}
        beatLedIndex={uiBeatLed}
        onOpenTracks={() => openPause('tracks')}
        onSelectDifficulty={(diffId) => {
          updateProfile({ selectedDifficulty: diffId });
          resetRound(engineRef.current.phase === 'PLAYING', null, activeSong, diffId);
        }}
        onOpenMods={openMods}
        onOpenPause={() => openPause('main')}
      />

      <OrbitStage
        renderStateRef={canvasStateRef}
        themeId={profile.theme}
        bgFxMode={profile.bgFxMode}
        allowPointerTap={profile.allowPointerTap}
        onTriggerTap={handleTriggerAction}
        songHudTitle={`${activeSong.title.toUpperCase()} (${activeSong.artist}) · ${activeDifficulty} ${star}`}
        songTimerText={`${formatTimeSec(uiSongTime)} / ${formatTimeSec(activeSong.durationSec)} · ${uiSection}`}
        songProgressPct={progressPct}
        score={uiScore}
        streak={uiStreak}
        bestScore={profile.bestScore}
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
        onSkipTutorial={() => {
          const eng = engineRef.current;
          eng.tutorialGuideDisabled = true;
          eng.lessonSlowActive = false;
          eng.activeLesson = null;
          eng.timeScale = profile.equippedMods.includes('DT') ? 1.25 : 1.0;
          audioEngine.setPlaybackRate(eng.timeScale);
          setUiActiveLesson(null);
        }}
      />

      {/* Opaque Backdrop Scrim */}
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
        onSelectTrack={(songId, diffId) => {
          const targetSong = songs.find((s) => s.id === songId) || songs[0];
          setMustChooseTrack(false);
          updateProfile({ selectedSongId: songId, selectedDifficulty: diffId });
          setPauseOpen(false);
          resetRound(true, null, targetSong, diffId);
        }}
        onLookupNewgroundsId={handleLookupNewgroundsId}
        onUploadCustomAudio={handleUploadCustomAudio}
        customAudioStatus={customAudioStatus}
        onTogglePointer={() => updateProfile((p) => ({ ...p, allowPointerTap: !p.allowPointerTap }))}
        onReplayTutorial={() => {
          setMustChooseTrack(false);
          setPauseOpen(false);
          const tutSong = songs.find((s) => s.id === 'moments_passing') || songs[0];
          updateProfile({
            tutorialSongCompleted: false,
            selectedSongId: 'moments_passing',
            selectedDifficulty: 'CHILL',
          });
          resetRound(true, null, tutSong, 'CHILL');
        }}
        onUpdateAudioOffset={(ms) => updateProfile({ audioOffsetMs: ms })}
        onToggleMusic={() => {
          const next = !profile.musicEnabled;
          updateProfile({ musicEnabled: next });
          audioEngine.updateVolumes(next, profile.musicVolume, profile.soundEnabled, profile.sfxVolume);
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
            tutorialSongCompleted: true,
          });
          audioEngine.playLevelClear(profile.soundEnabled);
          return true;
        }}
        onResetCareer={() => {
          updateProfile((prev) => ({
            ...prev,
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

      <RunSummaryModal
        summary={summaryData}
        onRetry={() => resetRound(true, engineRef.current.sandboxModeId)}
        onOpenTracks={() => {
          setSummaryData(null);
          openPause('tracks');
        }}
      />
    </div>
  );
}
