import { DIFFICULTIES, STORAGE_KEY } from '../data/catalog';
import { DifficultyId, PlayerProfile, ThemeId } from '../types/game';

export const INITIAL_PROFILE: PlayerProfile = {
  trigger1Code: 'Space',
  trigger1Label: 'SPACE',
  trigger2Code: 'KeyJ',
  trigger2Label: 'KEY J',
  allowPointerTap: true,
  musicEnabled: true,
  musicVolume: 75,
  soundEnabled: true,
  sfxVolume: 80,
  hitSfxMode: 'switch',
  audioOffsetMs: 0,
  bgFxMode: 'dynamic',
  theme: 'emerald',
  selectedSongId: 'moments_passing',
  selectedDifficulty: 'CHILL',
  equippedMods: [],
  unlockedDiffs: ['CHILL'],
  tutorialSongCompleted: false,
  devUnlocked: false,
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
};

const VALID_THEMES: ThemeId[] = ['emerald', 'cobalt', 'amber'];

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_PROFILE };
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const merged: PlayerProfile = {
      ...INITIAL_PROFILE,
      ...parsed,
      tierBestScores: {
        ...INITIAL_PROFILE.tierBestScores,
        ...(parsed.tierBestScores || {}),
      },
      songRecords: { ...(parsed.songRecords || {}) },
      equippedMods: Array.isArray(parsed.equippedMods) ? parsed.equippedMods.slice(0, 3) : [],
      unlockedDiffs:
        Array.isArray(parsed.unlockedDiffs) && parsed.unlockedDiffs.length > 0
          ? (parsed.unlockedDiffs.filter((d) => d in DIFFICULTIES) as DifficultyId[])
          : ['CHILL'],
    };
    if (!VALID_THEMES.includes(merged.theme)) merged.theme = 'emerald';
    if (!(merged.selectedDifficulty in DIFFICULTIES)) merged.selectedDifficulty = 'CHILL';
    return merged;
  } catch {
    return { ...INITIAL_PROFILE };
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors in restricted incognito tabs
  }
}
