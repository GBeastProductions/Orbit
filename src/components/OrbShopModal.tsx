import React from 'react';
import { Check, Coins, Lock, X } from 'lucide-react';
import { CHASSIS_THEMES, DIFFICULTIES, DIFFICULTY_ORDER } from '../data/catalog';
import { DifficultyId, PlayerProfile, SongDefinition, ThemeId } from '../types/game';

interface OrbShopModalProps {
  open: boolean;
  profile: PlayerProfile;
  songs: SongDefinition[];
  onUnlockDifficulty: (diffId: DifficultyId, cost: number) => void;
  onUnlockSong: (songId: string, cost: number) => void;
  onUnlockTheme: (themeId: ThemeId, cost: number) => void;
  onEquipTheme: (themeId: ThemeId) => void;
  onClose: () => void;
}

export const OrbShopModal: React.FC<OrbShopModalProps> = ({
  open,
  profile,
  songs,
  onUnlockDifficulty,
  onUnlockSong,
  onUnlockTheme,
  onEquipTheme,
  onClose,
}) => {
  if (!open) return null;

  const unlockableSongs = songs.filter((s) => s.orbCost > 0);
  const unlockableThemes = (Object.keys(CHASSIS_THEMES) as ThemeId[]).filter(
    (tid) => CHASSIS_THEMES[tid].orbCost > 0,
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="orbVaultTitle"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="flex max-h-[84dvh] w-full max-w-2xl flex-col rounded-xl border border-[#374052] bg-[#0c0e12]">
        <div className="flex items-center justify-between gap-3 border-b border-[#222733] bg-[#141820] px-5 py-3.5 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Coins className="h-5 w-5 text-[#fbbf24]" />
            <div>
              <h2 id="orbVaultTitle" className="font-display text-base font-extrabold uppercase tracking-wider text-[#f3f4f6]">
                Orb Vault &amp; Unlocks
              </h2>
              <p className="text-[11px] text-[#9ca3af]">
                Earn Orbs from PERFECT strikes &amp; S/SS ranks (Cash Out requires C rank or higher)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="tabular-nums rounded-md border border-[#fbbf24]/50 bg-[#261a04] px-3 py-1 text-xs font-extrabold text-[#fbbf24]">
              {profile.orbs.toLocaleString()} Orbs
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Orb Vault"
              className="rounded-md border border-[#374052] bg-[#0c0e12] p-1.5 text-[#9ca3af] hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="orbit-scroll flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Difficulty Tiers */}
          <section>
            <h3 className="mb-2 border-b border-[#222733] pb-1 text-xs font-extrabold uppercase tracking-widest text-[#9ca3af]">
              Difficulty Tiers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DIFFICULTY_ORDER.filter((d) => DIFFICULTIES[d].orbCost > 0).map((diffId) => {
                const d = DIFFICULTIES[diffId];
                const unlocked = profile.devUnlocked || profile.unlockedDiffs.includes(diffId);
                const canAfford = profile.orbs >= d.orbCost;

                return (
                  <div
                    key={diffId}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                      unlocked
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-dim)]'
                        : 'border-[#222733] bg-[#141820]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-[#f3f4f6] tabular-nums">
                        {d.name} · {d.mult.toFixed(2)}x
                      </div>
                      <div className="text-[11px] text-[#9ca3af] truncate">{d.desc}</div>
                    </div>

                    {unlocked ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-[var(--theme-bright)] shrink-0">
                        <Check className="h-3.5 w-3.5" /> Owned
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onUnlockDifficulty(diffId, d.orbCost)}
                        className="flex items-center gap-1 rounded-md bg-[#fbbf24] px-3 py-1.5 text-xs font-extrabold text-black hover:bg-[#fde047] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 tabular-nums"
                      >
                        <Lock className="h-3 w-3" />
                        <span>{d.orbCost} Orbs</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Curated Newgrounds Tracks */}
          <section>
            <h3 className="mb-2 border-b border-[#222733] pb-1 text-xs font-extrabold uppercase tracking-widest text-[#9ca3af]">
              Newgrounds Classic Levels
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {unlockableSongs.map((song) => {
                const unlocked = profile.devUnlocked || profile.unlockedSongs.includes(song.id);
                const canAfford = profile.orbs >= song.orbCost;

                return (
                  <div
                    key={song.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                      unlocked
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-dim)]'
                        : 'border-[#222733] bg-[#141820]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-[#f3f4f6] truncate">
                        {song.title} — {song.artist}
                      </div>
                      <div className="text-[11px] text-[#9ca3af] tabular-nums">
                        NG #{song.newgroundsId} · {song.bpm} BPM
                      </div>
                    </div>

                    {unlocked ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-[var(--theme-bright)] shrink-0">
                        <Check className="h-3.5 w-3.5" /> Owned
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onUnlockSong(song.id, song.orbCost)}
                        className="flex items-center gap-1 rounded-md bg-[#fbbf24] px-3 py-1.5 text-xs font-extrabold text-black hover:bg-[#fde047] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 tabular-nums"
                      >
                        <Lock className="h-3 w-3" />
                        <span>{song.orbCost} Orbs</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Retro Arcade Skins */}
          <section>
            <h3 className="mb-2 border-b border-[#222733] pb-1 text-xs font-extrabold uppercase tracking-widest text-[#9ca3af]">
              Retro Arcade Chassis Skins
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {unlockableThemes.map((tid) => {
                const t = CHASSIS_THEMES[tid];
                const unlocked = profile.devUnlocked || profile.unlockedThemes.includes(tid);
                const equipped = profile.theme === tid;
                const canAfford = profile.orbs >= t.orbCost;

                return (
                  <div
                    key={tid}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#222733] bg-[#141820] p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-4 w-4 rounded-full border border-white/40 shrink-0"
                        style={{ backgroundColor: t.primary }}
                      />
                      <div>
                        <div className="text-xs font-extrabold text-[#f3f4f6]">{t.label} Cabinet</div>
                        <div className="text-[11px] text-[#9ca3af]">Dial &amp; HUD accent theme</div>
                      </div>
                    </div>

                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => onEquipTheme(tid)}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold cursor-pointer ${
                          equipped
                            ? 'bg-[var(--theme-primary)] text-[var(--theme-on-primary)]'
                            : 'border border-[#374052] bg-[#0c0e12] text-[#f3f4f6]'
                        }`}
                      >
                        {equipped ? 'Equipped' : 'Equip'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onUnlockTheme(tid, t.orbCost)}
                        className="flex items-center gap-1 rounded-md bg-[#fbbf24] px-3 py-1.5 text-xs font-extrabold text-black hover:bg-[#fde047] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 tabular-nums"
                      >
                        <Lock className="h-3 w-3" />
                        <span>{t.orbCost} Orbs</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
