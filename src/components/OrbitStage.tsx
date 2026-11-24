import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Coins, Shield } from 'lucide-react';
import { CHASSIS_THEMES, NEEDLE_TOLERANCE, WAVE_MODES } from '../data/catalog';
import { signedAngleDiff, TAU } from '../engine/beatmap';
import { RadialHudGauge } from './OrbitVectorAssets';
import {
  BgFxMode,
  GamePhase,
  HazardMine,
  HitEffect,
  HitErrorTick,
  PortalPair,
  SongSection,
  SongSectionCue,
  TargetSector,
  ThemeId,
  TutorialLesson,
  WaveModeId,
} from '../types/game';

export interface CanvasRenderState {
  phase: GamePhase;
  spinnerAngle: number;
  direction: 1 | -1;
  angularSpeed: number;
  waveModeId: WaveModeId;
  targets: TargetSector[];
  hazards: HazardMine[];
  portal: PortalPair | null;
  hitEffects: HitEffect[];
  hitErrorTicks: HitErrorTick[];
  hubStatusText: string;
  hubStatusColor: string | null;
  hubStatusTimer: number;
  shakeX: number;
  missDegrees: string;
  missNearestEdge: number;
  missSignedSpan: number;
  missReasonText?: string;
  dialVisualAlpha: number;
  bassEnergy: number;
  spectrumBins: Float32Array;
  beatPulse: number;
  streak: number;
  songProgressRatio: number;
  songSections: SongSectionCue[];
  songSection: SongSection;
  lessonSlowActive: boolean;
  activeLesson: TutorialLesson | null;
}

interface OrbitStageProps {
  renderStateRef: React.MutableRefObject<CanvasRenderState>;
  phase: GamePhase;
  themeId: ThemeId;
  bgFxMode: BgFxMode;
  allowPointerTap: boolean;
  onTriggerTap: () => void;
  songTimerText: string;
  score: number;
  streak: number;
  bestScore: number;
  unbankedOrbs: number;
  streakMult: number;
  totalMult: number;
  modeName: string;
  modeColor: string;
  shields: number;
  isTutorialRun: boolean;
  tutorialLives: number;
  activeLesson: TutorialLesson | null;
  showTutorialCompleteStripe: boolean;
  promptHint: string;
  trigger1Code: string;
  trigger1Label: string;
  trigger2Code: string;
  trigger2Label: string;
  onSkipTutorial: () => void;
}

function getComboTierMeta(streak: number): {
  tier: 0 | 1 | 2 | 3;
  label: string;
  accentClass: string;
} {
  if (streak >= 100) return { tier: 3, label: 'APEX 100+', accentClass: 'text-white' };
  if (streak >= 50) return { tier: 2, label: 'HARMONIC 50+', accentClass: 'text-[#fbbf24]' };
  if (streak >= 25) return { tier: 1, label: 'OVERDRIVE 25+', accentClass: 'text-[var(--accent-bright)]' };
  return { tier: 0, label: 'COMBO', accentClass: 'text-[#d1d5db]' };
}

export const OrbitStage: React.FC<OrbitStageProps> = ({
  renderStateRef,
  phase,
  themeId,
  bgFxMode,
  allowPointerTap,
  onTriggerTap,
  songTimerText,
  score,
  streak,
  bestScore,
  unbankedOrbs,
  streakMult,
  totalMult,
  modeName,
  modeColor,
  shields,
  isTutorialRun,
  tutorialLives,
  activeLesson,
  showTutorialCompleteStripe,
  promptHint,
  trigger1Code,
  trigger1Label,
  trigger2Code,
  trigger2Label,
  onSkipTutorial,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: 520, height: 420 });
  const [pressedKey, setPressedKey] = useState<'k1' | 'k2' | null>(null);

  const comboTier = getComboTierMeta(streak);

  // Track live mechanical key actuation for footer keycaps
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === trigger1Code) setPressedKey('k1');
      else if (e.code === trigger2Code) setPressedKey('k2');
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === trigger1Code || e.code === trigger2Code) setPressedKey(null);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [trigger1Code, trigger2Code]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { width: rect.width, height: rect.height };
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    window.addEventListener('resize', resize);

    let rafId = 0;
    const drawFrame = () => {
      const st = renderStateRef.current;
      const { width, height } = sizeRef.current;
      const cx = width / 2 + st.shakeX;
      const cy = height / 2;
      const maxR = Math.min(width / 2, height / 2) * 0.92;
      const theme = CHASSIS_THEMES[themeId] || CHASSIS_THEMES.emerald;

      ctx.clearRect(0, 0, width, height);

      const streakTier = st.streak >= 100 ? 3 : st.streak >= 50 ? 2 : st.streak >= 25 ? 1 : 0;

      // Subtle architectural radar rings when dynamic FX active
      if (bgFxMode === 'dynamic') {
        const energy = st.bassEnergy;
        const isDrop = st.songSection === 'DROP';
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const baseExpand = maxR * (0.98 + rIdx * 0.14) + energy * (10 + rIdx * 6);
          ctx.beginPath();
          ctx.arc(cx, cy, baseExpand, 0, TAU);
          ctx.strokeStyle = `rgba(${theme.bgAccentRgb}, ${(isDrop ? 0.22 : 0.1) * (1 - rIdx * 0.3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      let isIlluminated = false;
      if (st.phase === 'PLAYING') {
        for (let i = 0; i < st.targets.length; i++) {
          const t = st.targets[i];
          if (Math.abs(signedAngleDiff(st.spinnerAngle, t.angle)) <= t.halfWidth + NEEDLE_TOLERANCE) {
            isIlluminated = true;
            break;
          }
        }
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, st.dialVisualAlpha));

      const beatExpand = st.beatPulse * 2.0;
      const bezelOuterR = maxR * 0.78 + beatExpand;
      const trackRadius = maxR * 0.62;
      const trackWidth = Math.max(20, maxR * 0.132);
      const innerRadius = trackRadius - trackWidth / 2;
      const outerRadius = trackRadius + trackWidth / 2;

      // 1. DIEGETIC RADIAL FREQUENCY SPECTRUM (36 crisp vector ticks hugging outer dial)
      if (bgFxMode === 'dynamic' && st.spectrumBins.length > 0) {
        const binCount = st.spectrumBins.length;
        const specBaseR = bezelOuterR + 17;
        for (let i = 0; i < binCount; i++) {
          const angle = -Math.PI / 2 + (i * TAU) / binCount;
          const mag = st.spectrumBins[i] || 0;
          const barLen = 2 + mag * Math.max(12, maxR * 0.12);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * specBaseR, cy + Math.sin(angle) * specBaseR);
          ctx.lineTo(cx + Math.cos(angle) * (specBaseR + barLen), cy + Math.sin(angle) * (specBaseR + barLen));
          ctx.strokeStyle =
            mag > 0.65
              ? streakTier >= 2
                ? '#fbbf24'
                : theme.bright
              : `rgba(${theme.bgAccentRgb}, ${(0.28 + mag * 0.5).toFixed(2)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // 2. DIEGETIC SONG PROGRESS RING ARC (wrapped cleanly around outer perimeter)
      const progR = bezelOuterR + 11;
      ctx.beginPath();
      ctx.arc(cx, cy, progR, 0, TAU);
      ctx.strokeStyle = '#1b2230';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (st.songProgressRatio > 0.002) {
        ctx.beginPath();
        ctx.arc(cx, cy, progR, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, st.songProgressRatio));
        ctx.strokeStyle = streakTier >= 2 ? '#fbbf24' : theme.bright;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Section cue notches along the progress arc
      for (let s = 0; s < st.songSections.length; s++) {
        const cueAngle = -Math.PI / 2 + TAU * st.songSections[s].startPct;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(cueAngle) * (progR - 3), cy + Math.sin(cueAngle) * (progR - 3));
        ctx.lineTo(cx + Math.cos(cueAngle) * (progR + 3), cy + Math.sin(cueAngle) * (progR + 3));
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }

      // 3. BPM-Reactive 60 Perimeter Bezel Ticks (escalating accent with combo tier)
      for (let i = 0; i < 60; i++) {
        const angle = (i * TAU) / 60;
        const isMajor = i % 5 === 0;
        const rStart = bezelOuterR + 1.5;
        const rEnd = bezelOuterR + (isMajor ? 8 : 3.5);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * rStart, cy + Math.sin(angle) * rStart);
        ctx.lineTo(cx + Math.cos(angle) * rEnd, cy + Math.sin(angle) * rEnd);
        ctx.strokeStyle = isMajor
          ? streakTier === 3
            ? '#ffffff'
            : streakTier === 2
            ? '#fbbf24'
            : streakTier === 1
            ? theme.bright
            : '#4b5563'
          : '#1f2430';
        ctx.lineWidth = isMajor ? 1.5 : 1;
        ctx.stroke();
      }

      // Solid Tactile Bezel Body
      ctx.beginPath();
      ctx.arc(cx, cy, bezelOuterR, 0, TAU);
      ctx.fillStyle = '#0c0e13';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, bezelOuterR, 0, TAU);
      ctx.strokeStyle = st.lessonSlowActive
        ? '#fde047'
        : isIlluminated
        ? theme.bright
        : streakTier >= 2
        ? '#fbbf24'
        : '#2e3545';
      ctx.lineWidth = st.lessonSlowActive ? 2.2 : 1.35;
      ctx.stroke();

      // Track Channel
      ctx.beginPath();
      ctx.arc(cx, cy, trackRadius, 0, TAU);
      ctx.strokeStyle = '#07090d';
      ctx.lineWidth = trackWidth;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, TAU);
      ctx.strokeStyle = '#1f2430';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, TAU);
      ctx.strokeStyle = streakTier >= 2 ? '#374052' : '#1f2430';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Harmonic Inner Resonance Ring at 50x+ Combo
      if (streakTier >= 2) {
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius - 5, 0, TAU);
        ctx.strokeStyle = streakTier === 3 ? '#ffffff' : '#fbbf24';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Directional Trail
      if (st.phase === 'PLAYING' || st.phase === 'TUTORIAL_CINEMATIC') {
        const speedRatio = Math.min(1, Math.max(0, (st.angularSpeed - 1.2) / 6.2));
        const trailSpan = 0.18 + speedRatio * 0.52;
        const steps = theme.trailSteps.length;
        const stepSpan = trailSpan / steps;

        for (let s = 0; s < steps; s++) {
          const bandEnd = st.spinnerAngle - st.direction * ((steps - 1 - s) * stepSpan);
          const bandStart = bandEnd - st.direction * stepSpan;
          ctx.beginPath();
          ctx.arc(cx, cy, trackRadius, bandStart, bandEnd, st.direction === -1);
          ctx.strokeStyle = theme.trailSteps[s];
          ctx.lineWidth = trackWidth - 4;
          ctx.lineCap = 'butt';
          ctx.stroke();
        }
      }

      // Portal Nodes
      if (st.portal) {
        const ex = cx + Math.cos(st.portal.entryAngle) * trackRadius;
        const ey = cy + Math.sin(st.portal.entryAngle) * trackRadius;
        const ox = cx + Math.cos(st.portal.exitAngle) * trackRadius;
        const oy = cy + Math.sin(st.portal.exitAngle) * trackRadius;

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ox, oy);
        ctx.strokeStyle = st.portal.warped ? '#22d3ee' : '#e879f9';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        [st.portal.entryAngle, st.portal.exitAngle].forEach((pAngle, idx) => {
          ctx.beginPath();
          ctx.arc(cx, cy, trackRadius, pAngle - st.portal!.halfWidth, pAngle + st.portal!.halfWidth);
          ctx.strokeStyle = idx === 0 ? '#e879f9' : '#06b6d4';
          ctx.lineWidth = trackWidth - 2;
          ctx.stroke();
        });
      }

      // Hazard Mines
      for (let i = 0; i < st.hazards.length; i++) {
        const h = st.hazards[i];
        ctx.beginPath();
        ctx.arc(cx, cy, trackRadius, h.angle - h.halfWidth, h.angle + h.halfWidth);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = trackWidth - 2;
        ctx.stroke();

        const hx = cx + Math.cos(h.angle) * trackRadius;
        const hy = cy + Math.sin(h.angle) * trackRadius;
        ctx.fillStyle = '#000000';
        ctx.font = '800 11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×', hx, hy);
      }

      // Target Sectors
      const isFailed = st.phase === 'SUMMARY' && Boolean(st.missReasonText);
      for (let i = 0; i < st.targets.length; i++) {
        const t = st.targets[i];
        const tStart = t.angle - t.halfWidth;
        const tEnd = t.angle + t.halfWidth;
        const overThis =
          Math.abs(signedAngleDiff(st.spinnerAngle, t.angle)) <= t.halfWidth + NEEDLE_TOLERANCE;

        let fillCol = theme.primary;
        if (isFailed) {
          fillCol = '#2e1216';
        } else if (st.waveModeId === 'CCW_RED') {
          fillCol = overThis ? '#fca5a5' : '#ef4444';
        } else if (st.waveModeId === 'PURPLE_SURGE') {
          fillCol = overThis ? '#d8b4fe' : '#a855f7';
        } else if (st.waveModeId === 'DOUBLE_TAP' && t.tapsLeft === 2) {
          fillCol = overThis ? '#7dd3fc' : '#0284c7';
        } else if (overThis) {
          fillCol = theme.bright;
        }

        ctx.save();
        ctx.globalAlpha = st.dialVisualAlpha * t.alpha;

        if (st.lessonSlowActive) {
          ctx.beginPath();
          ctx.arc(cx, cy, outerRadius + 7, tStart - 0.05, tEnd + 0.05);
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, trackRadius, tStart, tEnd);
        ctx.strokeStyle = fillCol;
        ctx.lineWidth = trackWidth - 2;
        ctx.lineCap = 'butt';
        ctx.stroke();

        if (!isFailed) {
          const bullseyeHalf = t.halfWidth * 0.24;
          ctx.beginPath();
          ctx.arc(cx, cy, trackRadius, t.angle - bullseyeHalf, t.angle + bullseyeHalf);
          ctx.strokeStyle = overThis ? '#ffffff' : theme.edgeTick;
          ctx.lineWidth = trackWidth - 2;
          ctx.stroke();
        }

        if (t.seqNum > 0) {
          const tx = cx + Math.cos(t.angle) * trackRadius;
          const ty = cy + Math.sin(t.angle) * trackRadius;
          ctx.fillStyle = '#000000';
          ctx.font = '800 12px ui-monospace, Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(t.seqNum), tx, ty);
        } else if (st.waveModeId === 'DOUBLE_TAP' && t.tapsLeft === 2) {
          const tx = cx + Math.cos(t.angle) * trackRadius;
          const ty = cy + Math.sin(t.angle) * trackRadius;
          ctx.fillStyle = '#000000';
          ctx.font = '800 11px ui-monospace, Menlo, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('2×', tx, ty);
        }

        ctx.restore();
      }

      if (isFailed && Math.abs(st.missSignedSpan) > 0.001) {
        const ccw = st.missSignedSpan < 0;
        ctx.beginPath();
        ctx.arc(cx, cy, trackRadius, st.missNearestEdge, st.missNearestEdge + st.missSignedSpan, ccw);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = trackWidth - 4;
        ctx.stroke();
      }

      // Hit Wave Ripples
      for (let i = 0; i < st.hitEffects.length; i++) {
        const fx = st.hitEffects[i];
        const progress = 1 - fx.timer / fx.duration;
        const waveRadius = bezelOuterR + 2 + progress * 14;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.beginPath();
        ctx.arc(cx, cy, waveRadius, 0, TAU);
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = Math.max(1, 2.2 * (1 - progress));
        ctx.stroke();

        const tx = cx + Math.cos(fx.angle) * (bezelOuterR + 16 + progress * 8);
        const ty = cy + Math.sin(fx.angle) * (bezelOuterR + 16 + progress * 8);
        ctx.fillStyle = fx.color;
        ctx.font = '800 10px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fx.label, tx, ty);
        ctx.restore();
      }

      // 4. DIEGETIC CURVED HIT-ERROR TIMING GAUGE (hugged inside lower hub arc)
      const gaugeR = innerRadius * 0.78;
      const gaugeCenter = Math.PI / 2;
      const gaugeHalfSpan = 0.72;
      ctx.beginPath();
      ctx.arc(cx, cy, gaugeR, gaugeCenter - gaugeHalfSpan, gaugeCenter + gaugeHalfSpan);
      ctx.strokeStyle = '#222733';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Center 0° white notch
      ctx.beginPath();
      ctx.moveTo(cx, cy + gaugeR - 5);
      ctx.lineTo(cx, cy + gaugeR + 5);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Error ticks along the curved arc (-early left, +late right from player perspective)
      for (let i = 0; i < st.hitErrorTicks.length; i++) {
        const tick = st.hitErrorTicks[i];
        const alpha = Math.max(0, 1 - tick.age / 1.8);
        if (alpha <= 0) continue;
        // On bottom arc: Math.PI/2 + offset moves left when positive (clockwise), so invert to keep Early=Left, Late=Right
        const tickAngle = gaugeCenter - tick.offsetSigned * (gaugeHalfSpan * 0.92);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(tickAngle) * (gaugeR - 4), cy + Math.sin(tickAngle) * (gaugeR - 4));
        ctx.lineTo(cx + Math.cos(tickAngle) * (gaugeR + 4), cy + Math.sin(tickAngle) * (gaugeR + 4));
        ctx.strokeStyle = tick.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // 5. DIEGETIC PERIPHERAL CENTER HUB (Live Combo + Judgment Flash at Focal Point)
      const hubRadius = innerRadius * 0.54;
      const hubActive = isIlluminated || st.hubStatusTimer > 0;

      ctx.beginPath();
      ctx.arc(cx, cy, hubRadius, 0, TAU);
      ctx.fillStyle = isFailed ? '#1f0b0e' : hubActive ? theme.hubActiveFill : '#080a0f';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, hubRadius, 0, TAU);
      ctx.strokeStyle = isFailed
        ? '#ef4444'
        : hubActive
        ? theme.bright
        : streakTier >= 2
        ? '#fbbf24'
        : '#242936';
      ctx.lineWidth = hubActive ? 1.5 : 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isFailed) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '800 12px ui-monospace, Menlo, monospace';
        ctx.fillText('MISS', cx, cy - 8);
        ctx.fillStyle = '#fca5a5';
        ctx.font = '700 10px ui-monospace, Menlo, monospace';
        ctx.fillText(`${st.missDegrees}°`, cx, cy + 8);
      } else if (st.phase === 'PLAYING') {
        if (st.hubStatusTimer > 0) {
          ctx.fillStyle = st.hubStatusColor || theme.bright;
          ctx.font = '900 11px ui-monospace, Menlo, monospace';
          ctx.fillText(st.hubStatusText, cx, cy - 10);
          ctx.fillStyle = streakTier >= 2 ? '#fbbf24' : '#f3f4f6';
          ctx.font = '900 18px ui-monospace, Menlo, monospace';
          ctx.fillText(`${st.streak}x`, cx, cy + 8);
        } else {
          ctx.fillStyle = st.lessonSlowActive ? '#fde047' : isIlluminated ? theme.bright : '#9ca3af';
          ctx.font = '800 10px ui-monospace, Menlo, monospace';
          const dirLabel = st.lessonSlowActive ? 'DIAL 0.28×' : st.direction === 1 ? 'CW ↻' : 'CCW ↺';
          ctx.fillText(dirLabel, cx, cy - 10);
          ctx.fillStyle = streakTier >= 2 ? '#fbbf24' : '#f3f4f6';
          ctx.font = '900 18px ui-monospace, Menlo, monospace';
          ctx.fillText(`${st.streak}x`, cx, cy + 8);
        }
      } else {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '800 11px ui-monospace, Menlo, monospace';
        ctx.fillText(st.phase === 'PAUSED' ? 'PAUSED' : 'READY', cx, cy);
      }

      // Needle Arm & Pointer
      const sa = st.spinnerAngle;
      const cosA = Math.cos(sa);
      const sinA = Math.sin(sa);

      ctx.beginPath();
      ctx.moveTo(cx + cosA * hubRadius, cy + sinA * hubRadius);
      ctx.lineTo(cx + cosA * (innerRadius - 1), cy + sinA * (innerRadius - 1));
      ctx.strokeStyle = isFailed ? '#ef4444' : '#374052';
      ctx.lineWidth = 2;
      ctx.stroke();

      const needleColor = isFailed ? '#ef4444' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx + cosA * (innerRadius - 5), cy + sinA * (innerRadius - 5));
      ctx.lineTo(cx + cosA * (outerRadius + 5), cy + sinA * (outerRadius + 5));
      ctx.strokeStyle = needleColor;
      ctx.lineWidth = 4;
      ctx.stroke();

      const tipBaseR = outerRadius + 8;
      const tipPeakR = outerRadius + 14;
      const perpX = -sinA * 4;
      const perpY = cosA * 4;

      ctx.beginPath();
      ctx.moveTo(cx + cosA * tipPeakR, cy + sinA * tipPeakR);
      ctx.lineTo(cx + cosA * tipBaseR + perpX, cy + sinA * tipBaseR + perpY);
      ctx.lineTo(cx + cosA * tipBaseR - perpX, cy + sinA * tipBaseR - perpY);
      ctx.closePath();
      ctx.fillStyle = needleColor;
      ctx.fill();

      ctx.restore();
      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [renderStateRef, themeId, bgFxMode]);

  const streakGoal = streak >= 50 ? 100 : streak >= 25 ? 50 : 25;
  const streakGaugeProgress = Math.min(1, streak / streakGoal);
  const streakGaugeColor =
    streak >= 100 ? '#ffffff' : streak >= 50 ? '#fbbf24' : 'var(--accent-bright)';
  const multGaugeProgress = Math.min(1, Math.max(0.08, (totalMult - 0.8) / 3.2));

  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 flex flex-1 flex-col items-center justify-center overflow-hidden bg-transparent px-3 sm:px-6 py-2"
    >
      {/* Compact Mobile Telemetry Strip (visible < md only, where TopBar notch is hidden) */}
      <div className="z-10 flex md:hidden w-full max-w-md items-center justify-between border-b border-[#1c2331] pb-2 mb-1 tabular-nums">
        <div>
          <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#6b7280]">
            Score
          </span>
          <span className="font-display text-2xl font-black leading-none text-white">
            {score.toLocaleString()}
          </span>
        </div>
        <div className="text-center">
          <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--accent-bright)]">
            {songTimerText}
          </span>
          <span className={`text-lg font-black leading-none ${comboTier.accentClass}`}>
            {streak}x
          </span>
        </div>
        <div className="text-right">
          <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#fbbf24]">
            Orbs
          </span>
          <span className="text-xl font-black leading-none text-[#fbbf24]">
            +{unbankedOrbs}
          </span>
        </div>
      </div>

      {/* CLEAN PERIPHERAL HUD: Left Telemetry + Central Calibration Ring + Right Combo Gauge */}
      <div className="relative z-10 flex w-full max-w-6xl flex-1 min-h-0 items-center justify-center gap-4 lg:gap-12">
        {/* LEFT WING HUD (Desktop md+) */}
        <div className="hidden md:flex w-44 lg:w-52 flex-col items-end justify-center gap-5 text-right tabular-nums">
          <div>
            <span className="block text-[10px] font-bold tracking-[0.24em] uppercase text-[#9ca3af]">
              Score
            </span>
            <span className="font-display mt-0.5 block text-5xl lg:text-6xl font-black leading-none text-white">
              {score.toLocaleString()}
            </span>
            {bestScore > 0 && (
              <span className="mt-1.5 block text-[11px] font-bold text-[#6b7280]">
                Best <strong className="text-[#d1d5db]">{bestScore.toLocaleString()}</strong>
              </span>
            )}
          </div>

          <RadialHudGauge
            valueText={`${totalMult.toFixed(2)}x`}
            label="Mult"
            sublabel={`Combo ${streakMult.toFixed(2)}x`}
            progress={multGaugeProgress}
            color="var(--accent-bright)"
            size={108}
          />

          <span
            className="border-r-2 pr-2.5 text-[11px] font-black uppercase tracking-[0.16em]"
            style={{ borderColor: modeColor, color: modeColor }}
          >
            {modeName}
          </span>
        </div>

        {/* CENTER: High-DPI Diegetic Calibration Ring */}
        <div
          ref={wrapRef}
          className="relative flex h-[min(78vw,66vh,480px)] w-[min(78vw,66vh,480px)] shrink-0 items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
              if (!allowPointerTap) return;
              if (e.button !== 0 && e.pointerType === 'mouse') return;
              e.preventDefault();
              onTriggerTap();
            }}
            aria-label="ORBIT Rhythm Calibration Ring"
            className="block h-full w-full cursor-pointer touch-manipulation"
          />

          {activeLesson && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="clip-chamfer-md pointer-events-auto absolute -bottom-2 left-1/2 z-20 w-[min(92vw,375px)] -translate-x-1/2 border border-[#fde047] bg-[#0b0e14] px-4 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="tabular-nums text-[10px] font-extrabold tracking-widest uppercase text-[#fde047]">
                  Tutorial Guide · {activeLesson.title}
                </span>
                <button
                  type="button"
                  onClick={onSkipTutorial}
                  className="text-[10px] font-bold text-[#9ca3af] hover:text-white underline cursor-pointer whitespace-nowrap"
                >
                  Skip Guide
                </button>
              </div>
              <p className="mt-1 text-xs leading-snug text-[#f3f4f6]">{activeLesson.instruction}</p>
            </motion.div>
          )}
        </div>

        {/* RIGHT WING HUD (Desktop md+) */}
        <div className="hidden md:flex w-44 lg:w-52 flex-col items-start justify-center gap-5 text-left tabular-nums">
          <RadialHudGauge
            valueText={`${streak}x`}
            label={comboTier.label}
            sublabel={`Next ${streakGoal}x`}
            progress={streakGaugeProgress}
            color={streakGaugeColor}
            size={116}
          />

          <div
            className="border-l-2 border-[#fbbf24] pl-3"
            title="Unbanked Orbs (Requires C rank or higher to Cash Out)"
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-[#fbbf24]">
              Orbs
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-2xl font-black leading-none text-[#fbbf24]">
              <Coins className="h-4 w-4" />
              <span>+{unbankedOrbs}</span>
            </span>
          </div>

          {(shields > 0 || isTutorialRun) && (
            <div className="flex items-center gap-2 text-xs font-extrabold">
              <Shield className="h-4 w-4 text-[var(--accent-bright)]" />
              {isTutorialRun ? (
                <span className="text-[#fbbf24]">Shield ×{tutorialLives}</span>
              ) : (
                <span className="text-[var(--accent-bright)]">Aegis ×{shields}</span>
              )}
            </div>
          )}

          {/* Compact Hexagonal Live Keycap Indicators */}
          <div className="flex items-center gap-2">
            <span
              data-pressed={pressedKey === 'k1'}
              className="tactile-key clip-hex flex h-8 min-w-[54px] items-center justify-center bg-[#2d3648] p-[1px] data-[pressed=true]:bg-[var(--accent-bright)]"
            >
              <span className="clip-hex flex h-full w-full items-center justify-center bg-[#0c0f16] px-2 text-[10px] font-black text-[#d1d5db]">
                {trigger1Label}
              </span>
            </span>
            <span
              data-pressed={pressedKey === 'k2'}
              className="tactile-key clip-hex flex h-8 min-w-[54px] items-center justify-center bg-[#2d3648] p-[1px] data-[pressed=true]:bg-[var(--accent-bright)]"
            >
              <span className="clip-hex flex h-full w-full items-center justify-center bg-[#0c0f16] px-2 text-[10px] font-black text-[#d1d5db]">
                {trigger2Label}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Tutorial Complete Banner Stripe */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed left-0 right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center justify-center gap-1 border-y-2 border-[var(--accent)] bg-[#090c12] py-4 px-5 transition-all duration-200 ${
          showTutorialCompleteStripe ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
        }`}
      >
        <span className="tabular-nums text-[11px] font-extrabold tracking-[0.2em] uppercase text-[var(--accent-bright)]">
          Calibration Verified
        </span>
        <span className="font-display text-2xl font-black tracking-[0.14em] uppercase text-[#f3f4f6]">
          Tutorial Complete
        </span>
        <span className="text-xs text-[#9ca3af]">
          Orb Cash-Out Unlocked · Spend Orbs in the Vault for Higher Tiers &amp; Newgrounds Tracks
        </span>
      </div>

      {/* Quiet Prompt Hint ONLY while IDLE / pre-start */}
      {phase === 'IDLE' && (
        <div className="z-10 pb-2 text-center text-xs font-semibold text-[#9ca3af]">
          {promptHint}
        </div>
      )}
    </motion.main>
  );
};

export function getWaveModeMeta(modeId: WaveModeId) {
  return WAVE_MODES.find((m) => m.id === modeId) || WAVE_MODES[0];
}
