import { HitSfxMode, SongDefinition } from '../types/game';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface DecodedCustomAudio {
  buffer: AudioBuffer;
  durationSec: number;
  estimatedBpm: number;
  onsets: number[];
}

class OrbitAudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqBins: Uint8Array<ArrayBuffer> | null = null;
  private sfxNoiseBuffer: AudioBuffer | null = null;

  private bufferCache = new Map<string, AudioBuffer>();
  private loadingPromises = new Map<string, Promise<AudioBuffer | null>>();

  private activeSource: AudioBufferSourceNode | null = null;
  private activeSongId: string | null = null;
  private playing = false;
  private currentRate = 1.0;
  private lastCtxTime = 0;
  private integratedSongSec = 0;
  private activeDurationSec = 0;

  ensureContext(): AudioContext | null {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.78;
      this.freqBins = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.musicGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  updateVolumes(musicEnabled: boolean, musicVol: number, soundEnabled: boolean, sfxVol: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(musicEnabled ? (musicVol / 100) * 0.72 : 0, ctx.currentTime, 0.02);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(soundEnabled ? (sfxVol / 100) * 0.78 : 0, ctx.currentTime, 0.01);
    }
  }

  async loadSongBuffer(song: SongDefinition): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(song.id)) {
      return this.bufferCache.get(song.id) || null;
    }
    if (this.loadingPromises.has(song.id)) {
      return this.loadingPromises.get(song.id) || null;
    }

    const ctx = this.ensureContext();
    if (!ctx) return null;

    const task = (async () => {
      try {
        const res = await fetch(song.audioUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        this.bufferCache.set(song.id, decoded);
        return decoded;
      } catch (err) {
        console.warn(`Could not load audio for ${song.title}:`, err);
        return null;
      } finally {
        this.loadingPromises.delete(song.id);
      }
    })();

    this.loadingPromises.set(song.id, task);
    return task;
  }

  async decodeCustomFile(songId: string, file: File): Promise<DecodedCustomAudio | null> {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    try {
      const arrayBuf = await file.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuf);
      this.bufferCache.set(songId, buffer);
      const { estimatedBpm, onsets } = this.analyzeAudioBeats(buffer);
      return {
        buffer,
        durationSec: buffer.duration,
        estimatedBpm,
        onsets,
      };
    } catch (err) {
      console.warn('Custom audio decode failed:', err);
      return null;
    }
  }

  /**
   * Lightweight energy-flux onset detector for custom Newgrounds / local MP3 files.
   */
  analyzeAudioBeats(buffer: AudioBuffer): { estimatedBpm: number; onsets: number[] } {
    const data = buffer.getChannelData(0);
    const sr = buffer.sampleRate;
    const hop = Math.floor(sr * 0.02); // 20ms analysis windows
    const energies: number[] = [];

    for (let i = 0; i < data.length; i += hop) {
      let sum = 0;
      const end = Math.min(data.length, i + hop);
      for (let j = i; j < end; j++) {
        sum += data[j] * data[j];
      }
      energies.push(Math.sqrt(sum / Math.max(1, end - i)));
    }

    const onsets: number[] = [];
    const win = 10;
    let lastOnset = -1;

    for (let i = win; i < energies.length; i++) {
      let avg = 0;
      for (let k = i - win; k < i; k++) avg += energies[k];
      avg /= win;
      const t = (i * hop) / sr;
      if (energies[i] > avg * 1.48 && energies[i] > 0.045 && t - lastOnset >= 0.24) {
        onsets.push(Number(t.toFixed(3)));
        lastOnset = t;
      }
    }

    // Estimate median beat interval -> BPM
    let estimatedBpm = 124;
    if (onsets.length >= 8) {
      const intervals: number[] = [];
      for (let i = 1; i < Math.min(onsets.length, 90); i++) {
        const diff = onsets[i] - onsets[i - 1];
        if (diff >= 0.28 && diff <= 1.0) intervals.push(diff);
      }
      if (intervals.length > 0) {
        intervals.sort((a, b) => a - b);
        const median = intervals[Math.floor(intervals.length / 2)];
        let bpm = 60 / median;
        while (bpm < 86) bpm *= 2;
        while (bpm > 172) bpm /= 2;
        estimatedBpm = Math.round(bpm);
      }
    }

    return { estimatedBpm, onsets };
  }

  getCachedDuration(songId: string): number | null {
    const buf = this.bufferCache.get(songId);
    return buf ? buf.duration : null;
  }

  stop(): void {
    this.activeSongId = null;
    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // Ignore already-stopped source
      }
      this.activeSource = null;
    }
    this.playing = false;
  }

  async startAtOffset(
    song: SongDefinition,
    offsetSec: number,
    playbackRate: number,
    musicEnabled: boolean,
    musicVol: number,
    soundEnabled: boolean,
    sfxVol: number,
    loop = false,
  ): Promise<number | null> {
    const ctx = this.ensureContext();
    if (!ctx) return null;

    this.stop();
    this.activeSongId = song.id;
    this.updateVolumes(musicEnabled, musicVol, soundEnabled, sfxVol);

    const buffer = await this.loadSongBuffer(song);
    if (!buffer || this.activeSongId !== song.id) {
      return null;
    }

    const safeOffset = Math.max(0, Math.min(offsetSec, Math.max(0, buffer.duration - 0.15)));
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = loop;
    src.playbackRate.setValueAtTime(playbackRate, ctx.currentTime);
    if (this.musicGain) {
      src.connect(this.musicGain);
    }

    this.activeSource = src;
    this.playing = true;
    this.currentRate = playbackRate;
    this.lastCtxTime = ctx.currentTime;
    this.integratedSongSec = safeOffset;
    this.activeDurationSec = buffer.duration;

    src.start(0, safeOffset);
    return buffer.duration;
  }

  setPlaybackRate(rate: number): void {
    if (!this.ctx || !this.activeSource || !this.playing) {
      this.currentRate = rate;
      return;
    }
    this.syncClock();
    this.currentRate = rate;
    this.activeSource.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.04);
  }

  syncClock(): number | null {
    if (!this.playing || !this.ctx) return null;
    const now = this.ctx.currentTime;
    const dt = Math.max(0, now - this.lastCtxTime);
    this.lastCtxTime = now;
    this.integratedSongSec += dt * this.currentRate;
    return this.integratedSongSec;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getActiveDuration(): number {
    return this.activeDurationSec;
  }

  /**
   * Returns normalized bass energy [0..1] for Chromebook-friendly background pulsing.
   */
  getBassEnergy(): number {
    if (!this.analyser || !this.freqBins || !this.playing) return 0;
    this.analyser.getByteFrequencyData(this.freqBins);
    let sum = 0;
    const count = Math.min(5, this.freqBins.length);
    for (let i = 0; i < count; i++) {
      sum += this.freqBins[i];
    }
    return Math.min(1, sum / (count * 255));
  }

  private getSfxNoise(): AudioBuffer | null {
    if (this.sfxNoiseBuffer || !this.ctx) return this.sfxNoiseBuffer;
    const len = Math.floor(this.ctx.sampleRate * 0.032);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
    }
    this.sfxNoiseBuffer = buf;
    return buf;
  }

  playHit(
    enabled: boolean,
    mode: HitSfxMode,
    combo: number,
    isPerfect: boolean,
    scaleNotes: number[],
  ): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const scale = scaleNotes.length > 0 ? scaleNotes : [60, 62, 64, 67, 69, 72];
    const midi = scale[combo % scale.length] + (isPerfect ? 12 : 0);
    const harmonicFreq = midiToFreq(midi);

    if (mode === 'harmonic') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(harmonicFreq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
      return;
    }

    if (mode === 'rimshot') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isPerfect ? 540 : 440, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.032);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.042);
      return;
    }

    // Tactile Switch + subtle scale ping
    const thock = ctx.createOscillator();
    const thockGain = ctx.createGain();
    thock.type = 'sine';
    thock.frequency.setValueAtTime(isPerfect ? 345 : 280, now);
    thock.frequency.exponentialRampToValueAtTime(72, now + 0.036);
    thockGain.gain.setValueAtTime(0.26, now);
    thockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.044);
    thock.connect(thockGain);
    thockGain.connect(this.sfxGain);
    thock.start(now);
    thock.stop(now + 0.046);

    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(harmonicFreq, now);
    pingGain.gain.setValueAtTime(0.001, now);
    pingGain.gain.linearRampToValueAtTime(isPerfect ? 0.08 : 0.045, now + 0.004);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    ping.connect(pingGain);
    pingGain.connect(this.sfxGain);
    ping.start(now);
    ping.stop(now + 0.08);

    const nb = this.getSfxNoise();
    if (nb) {
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = nb;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.11, now);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
      nSrc.connect(nGain);
      nGain.connect(this.sfxGain);
      nSrc.start(now);
      nSrc.stop(now + 0.02);
    }
  }

  playLessonSlowCue(enabled: boolean): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.22);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playShieldBreak(enabled: boolean): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playMiss(enabled: boolean): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [185, 130].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.16, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.24);
    });
  }

  playLevelClear(enabled: boolean): void {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.075);
      gain.gain.setValueAtTime(0.17, now + idx * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.075 + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.075);
      osc.stop(now + idx * 0.075 + 0.26);
    });
  }
}

export const audioEngine = new OrbitAudioEngine();
