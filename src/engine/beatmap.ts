import { DIFFICULTIES, MOD_CATALOG } from '../data/catalog';
import {
  BeatmapNote,
  DifficultyId,
  LetterRank,
  ModCode,
  SongDefinition,
  SongSection,
  WaveModeId,
} from '../types/game';

export const TAU = Math.PI * 2;

export function wrapAngle(angle: number): number {
  let a = angle % TAU;
  if (a < 0) a += TAU;
  return a;
}

export function signedAngleDiff(current: number, target: number): number {
  return Math.atan2(Math.sin(current - target), Math.cos(current - target));
}

export function formatTimeSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 40) return 4.0;
  if (streak >= 25) return 3.0;
  if (streak >= 15) return 2.0;
  if (streak >= 6) return 1.5;
  return 1.0;
}

export function computeModMultiplier(equippedMods: ModCode[]): number {
  let mult = 1.0;
  for (const code of equippedMods) {
    const mod = MOD_CATALOG.find((m) => m.code === code);
    if (mod) mult *= mod.mult;
  }
  return mult;
}

export function computeTotalMultiplier(
  diffId: DifficultyId,
  equippedMods: ModCode[],
  streak: number,
): number {
  const diff = DIFFICULTIES[diffId] || DIFFICULTIES.CHILL;
  return diff.mult * computeModMultiplier(equippedMods) * getStreakMultiplier(streak);
}

export function computeLetterRank(accuracy: number, missCount: number, cleared: boolean): LetterRank {
  if (!cleared) return 'D';
  if (accuracy >= 99.5 && missCount === 0) return 'SS';
  if (accuracy >= 95 && missCount === 0) return 'S';
  if (accuracy >= 88) return 'A';
  if (accuracy >= 75) return 'B';
  if (accuracy >= 60) return 'C';
  return 'D';
}

export function getSectionAtProgress(song: SongDefinition, prog: number): SongSection {
  let current: SongSection = 'INTRO';
  for (const cue of song.sections) {
    if (prog >= cue.startPct) {
      current = cue.label;
    }
  }
  return current;
}

function chooseWaveMode(
  diffId: DifficultyId,
  section: SongSection,
  idx: number,
  equippedMods: ModCode[],
  isTutorialTrack: boolean,
): WaveModeId {
  const hasOC = equippedMods.includes('OC');
  const hasOS = equippedMods.includes('OS');
  const hasHD = equippedMods.includes('HD');

  if (isTutorialTrack) {
    // Super approachable tutorial progression: CW -> CW -> CW -> CCW -> CW...
    if (idx < 3) return 'CW_GREEN';
    if (idx === 3) return 'CCW_RED';
    return idx % 4 === 2 ? 'CCW_RED' : 'CW_GREEN';
  }

  const isDrop = section === 'DROP';
  const isBreak = section === 'BREAKDOWN';
  const isBuild = section === 'BUILD-UP';

  let modeId: WaveModeId = idx % 3 === 1 ? 'CCW_RED' : 'CW_GREEN';

  if (diffId === 'CHILL') {
    if (hasOC && isDrop && idx % 3 === 0) {
      modeId = idx % 6 === 0 ? 'PURPLE_SURGE' : 'DOUBLE_TAP';
    } else {
      modeId = idx % 4 === 1 || idx % 4 === 3 ? 'CCW_RED' : 'CW_GREEN';
    }
  } else if (diffId === 'NORMAL') {
    if (isDrop) {
      const dropPool: WaveModeId[] = ['CW_GREEN', 'PURPLE_SURGE', 'DOUBLE_TAP', 'CCW_RED', 'MULTI_CLUSTER'];
      modeId = dropPool[idx % dropPool.length];
    } else if (isBreak) {
      modeId = 'SNIPER_MICRO';
    } else if (isBuild) {
      modeId = idx % 2 === 0 ? 'DOUBLE_TAP' : 'CW_GREEN';
    }
    if (hasOS && isBreak && idx % 3 === 0) modeId = 'OSU_PORTAL';
  } else if (diffId === 'HARD') {
    if (isDrop) {
      const hardPool: WaveModeId[] = ['ONE_PASS', 'MULTI_CLUSTER', 'CASCADE_CHAIN', 'ORDERED_SEQ', 'DOUBLE_TAP'];
      modeId = hardPool[idx % hardPool.length];
    } else if (isBuild) {
      modeId = idx % 2 === 0 ? 'ORDERED_SEQ' : 'PURPLE_SURGE';
    } else if (isBreak) {
      modeId = 'SNIPER_MICRO';
    }
    if (hasOS && isBreak && idx % 3 === 0) modeId = 'OSU_PORTAL';
  } else if (diffId === 'INSANE') {
    if (isDrop) {
      const insanePool: WaveModeId[] = ['SPRING_BOUNCE', 'BRAKE_DRIFT', 'MULTI_CLUSTER', 'CASCADE_CHAIN', 'ONE_PASS'];
      modeId = insanePool[idx % insanePool.length];
    } else if (isBuild) {
      modeId = idx % 2 === 0 ? 'DECAY_ARC' : 'ORDERED_SEQ';
    } else if (isBreak) {
      modeId = 'DECAY_ARC';
    }
    if (hasOS && isBreak && idx % 3 === 0) modeId = 'OSU_PORTAL';
  } else {
    if (isBreak && idx % 3 === 0) {
      modeId = 'OSU_PORTAL';
    } else if (isDrop) {
      const demonPool: WaveModeId[] = [
        'HAZARD_DECOY',
        'GHOST_PULSE',
        'MULTI_CLUSTER',
        'SPRING_BOUNCE',
        'BRAKE_DRIFT',
        'CASCADE_CHAIN',
      ];
      modeId = demonPool[idx % demonPool.length];
    } else if (isBuild) {
      modeId = idx % 2 === 0 ? 'DECAY_ARC' : 'ORDERED_SEQ';
    } else {
      modeId = idx % 2 === 0 ? 'ONE_PASS' : 'HAZARD_DECOY';
    }
  }

  if (hasHD && isBuild && idx % 3 === 0) {
    modeId = 'GHOST_PULSE';
  }

  return modeId;
}

export function buildSongBeatmap(
  song: SongDefinition,
  diffId: DifficultyId,
  equippedMods: ModCode[],
): BeatmapNote[] {
  const duration = Math.max(15, song.durationSec);
  const beatDur = 60 / Math.max(60, song.bpm);
  const isTutorialTrack = song.id === 'moments_passing';
  const notes: BeatmapNote[] = [];

  // If custom audio provided detected onsets, snap notes to real spectral peaks!
  if (song.isCustom && song.customOnsets && song.customOnsets.length >= 6) {
    const minSpacing = diffId === 'CHILL' ? 1.15 : diffId === 'NORMAL' ? 0.85 : diffId === 'HARD' ? 0.65 : 0.5;
    let lastTime = 0.6;
    let idx = 0;

    for (const onset of song.customOnsets) {
      if (onset > duration - 1.2) break;
      if (onset - lastTime < minSpacing) continue;
      const prog = onset / duration;
      const section = getSectionAtProgress(song, prog);
      const modeId = chooseWaveMode(diffId, section, idx, equippedMods, false);
      notes.push({
        index: idx,
        hitTime: onset,
        stepSec: onset - lastTime,
        modeId,
        section,
      });
      lastTime = onset;
      idx += 1;
    }
    if (notes.length >= 4) return notes;
  }

  // Standard deterministic BPM beatgrid aligned to song sections
  let t = Math.max(1.2, beatDur * 2);
  let idx = 0;

  while (t < duration - 1.5) {
    const prog = t / duration;
    const section = getSectionAtProgress(song, prog);
    const isDrop = section === 'DROP';
    const isBuild = section === 'BUILD-UP';

    let stepBeats = 2.0;
    if (isTutorialTrack) {
      stepBeats = isDrop ? 2.0 : 2.5;
    } else if (diffId === 'CHILL') {
      stepBeats = isDrop ? 1.5 : 2.0;
    } else if (diffId === 'NORMAL') {
      stepBeats = isDrop ? 1.0 : 1.5;
    } else if (diffId === 'HARD') {
      stepBeats = isDrop ? (idx % 2 === 0 ? 0.75 : 1.0) : 1.25;
    } else if (diffId === 'INSANE') {
      stepBeats = isDrop ? 0.75 : isBuild ? 0.75 : 1.0;
    } else {
      stepBeats = isDrop ? (idx % 3 === 0 ? 0.5 : 0.75) : 0.75;
    }

    const modeId = chooseWaveMode(diffId, section, idx, equippedMods, isTutorialTrack);
    notes.push({
      index: idx,
      hitTime: t,
      stepSec: stepBeats * beatDur,
      modeId,
      section,
    });

    t += stepBeats * beatDur;
    idx += 1;
  }

  return notes;
}
