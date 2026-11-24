import React, { useEffect, useRef } from 'react';
import { CHASSIS_THEMES, NEEDLE_TOLERANCE, WAVE_MODES } from '../data/catalog';
import { signedAngleDiff, TAU } from '../engine/beatmap';
import {
  BgFxMode,
  GamePhase,
  HazardMine,
  HitEffect,
  PortalPair,
  SongSection,
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
  beatPulse: number;
  songSection: SongSection;
  lessonSlowActive: boolean;
  activeLesson: TutorialLesson | null;
}

interface OrbitStageProps {
  renderStateRef: React.MutableRefObject<CanvasRenderState>;
  themeId: ThemeId;
  bgFxMode: BgFxMode;
  allowPointerTap: boolean;
  onTriggerTap: () => void;
  songHudTitle: string;
  songTimerText: string;
  songProgressPct: number;
  score: number;
  streak: number;
  bestScore: number;
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
  onSkipTutorial: () => void;
}

export const OrbitStage: React.FC<OrbitStageProps> = ({
  renderStateRef,
  themeId,
  bgFxMode,
  allowPointerTap,
  onTriggerTap,
  songHudTitle,
  songTimerText,
  songProgressPct,
  score,
  streak,
  bestScore,
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
  onSkipTutorial,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: 520, height: 420 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      // Cap DPR at 2 for Chromebook / tablet 60fps efficiency
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
      const maxR = Math.min(width / 2, height / 2) * 0.94;
      const theme = CHASSIS_THEMES[themeId] || CHASSIS_THEMES.emerald;

      // Clear background
      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, width, height);

      // Dynamic Chromebook-friendly Audio-Reactive Background
      if (bgFxMode === 'dynamic') {
        const energy = st.bassEnergy;
        const isDrop = st.songSection === 'DROP';
        const ringCount = 3;

        for (let rIdx = 0; rIdx < ringCount; rIdx++) {
          const baseExpand = maxR * (1.02 + rIdx * 0.16) + energy * (18 + rIdx * 8);
          ctx.beginPath();
          ctx.arc(cx, cy, baseExpand, 0, TAU);
          ctx.strokeStyle = `rgba(${theme.bgAccentRgb}, ${(isDrop ? 0.16 : 0.08) * (1 - rIdx * 0.25)})`;
          ctx.lineWidth = isDrop ? 1.5 : 1;
          ctx.stroke();
        }

        // Subtle radial crosshair spokes reacting to song beat pulse
        const spokeAlpha = 0.04 + energy * 0.08;
        ctx.strokeStyle = `rgba(${theme.bgAccentRgb}, ${spokeAlpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        for (let sIdx = 0; sIdx < 8; sIdx++) {
          const a = (sIdx * TAU) / 8 + st.spinnerAngle * 0.08;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (maxR * 0.92), cy + Math.sin(a) * (maxR * 0.92));
          ctx.lineTo(cx + Math.cos(a) * (maxR * 1.45), cy + Math.sin(a) * (maxR * 1.45));
          ctx.stroke();
        }
      }

      // Check if needle is over any target
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

      const beatExpand = st.beatPulse * 2.4;
      const bezelOuterR = maxR * 0.86 + beatExpand;
      const trackRadius = maxR * 0.69;
      const trackWidth = Math.max(22, maxR * 0.145);
      const innerRadius = trackRadius - trackWidth / 2;
      const outerRadius = trackRadius + trackWidth / 2;

      // 60-Tick Perimeter Scale
      for (let i = 0; i < 60; i++) {
        const angle = (i * TAU) / 60;
        const isMajor = i % 5 === 0;
        const rStart = bezelOuterR + 2;
        const rEnd = bezelOuterR + (isMajor ? 9 : 4);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * rStart, cy + Math.sin(angle) * rStart);
        ctx.lineTo(cx + Math.cos(angle) * rEnd, cy + Math.sin(angle) * rEnd);
        ctx.strokeStyle = isMajor ? '#374052' : '#1b202b';
        ctx.lineWidth = isMajor ? 1.5 : 1;
        ctx.stroke();
      }

      // Machined Outer Bezel
      const bezelGrad = ctx.createLinearGradient(
        cx - bezelOuterR,
        cy - bezelOuterR,
        cx + bezelOuterR,
        cy + bezelOuterR,
      );
      bezelGrad.addColorStop(0, '#1a1f29');
      bezelGrad.addColorStop(0.5, '#10131a');
      bezelGrad.addColorStop(1, '#07080c');

      ctx.beginPath();
      ctx.arc(cx, cy, bezelOuterR, 0, TAU);
      ctx.fillStyle = bezelGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, bezelOuterR, 0, TAU);
      ctx.strokeStyle = st.lessonSlowActive
        ? '#fde047'
        : isIlluminated
        ? theme.bright
        : '#242936';
      ctx.lineWidth = st.lessonSlowActive ? 2 : 1.25;
      ctx.stroke();

      // Recessed Calibration Track
      ctx.beginPath();
      ctx.arc(cx, cy, trackRadius, 0, TAU);
      ctx.strokeStyle = '#0c0f15';
      ctx.lineWidth = trackWidth;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, TAU);
      ctx.strokeStyle = '#1f2430';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, TAU);
      ctx.strokeStyle = '#1f2430';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Stepped Velocity Trail
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

      // Portal Nodes + Connecting Arc (OSU_PORTAL)
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

      // Hazard Mines (HAZARD_DECOY)
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
      const isFailed = st.phase === 'SUMMARY' && st.missReasonText;
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

        // Slow-motion spotlight ring around the target during tutorials
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

        // Inner 24% Bullseye Core
        if (!isFailed) {
          const bullseyeHalf = t.halfWidth * 0.24;
          ctx.beginPath();
          ctx.arc(cx, cy, trackRadius, t.angle - bullseyeHalf, t.angle + bullseyeHalf);
          ctx.strokeStyle = overThis ? '#ffffff' : theme.edgeTick;
          ctx.lineWidth = trackWidth - 2;
          ctx.stroke();
        }

        // Sequence Number Label (ORDERED_SEQ)
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

      // Red Miss Error Arc
      if (isFailed && Math.abs(st.missSignedSpan) > 0.001) {
        const ccw = st.missSignedSpan < 0;
        ctx.beginPath();
        ctx.arc(cx, cy, trackRadius, st.missNearestEdge, st.missNearestEdge + st.missSignedSpan, ccw);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = trackWidth - 4;
        ctx.stroke();
      }

      // Hit Shockwaves & Judgment Callouts
      for (let i = 0; i < st.hitEffects.length; i++) {
        const fx = st.hitEffects[i];
        const progress = 1 - fx.timer / fx.duration;
        const waveRadius = bezelOuterR + 2 + progress * 18;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.beginPath();
        ctx.arc(cx, cy, waveRadius, 0, TAU);
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = Math.max(1, 2.2 * (1 - progress));
        ctx.stroke();

        // Floating judgment text outside ring
        const tx = cx + Math.cos(fx.angle) * (bezelOuterR + 18 + progress * 10);
        const ty = cy + Math.sin(fx.angle) * (bezelOuterR + 18 + progress * 10);
        ctx.fillStyle = fx.color;
        ctx.font = '800 10px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fx.label, tx, ty);
        ctx.restore();
      }

      // Center Hub Cap
      const hubRadius = innerRadius * 0.52;
      const hubActive = isIlluminated || st.hubStatusTimer > 0;

      ctx.beginPath();
      ctx.arc(cx, cy, hubRadius, 0, TAU);
      ctx.fillStyle = isFailed ? '#1f0b0e' : hubActive ? theme.hubActiveFill : '#090b10';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, hubRadius, 0, TAU);
      ctx.strokeStyle = isFailed ? '#ef4444' : hubActive ? theme.bright : '#242936';
      ctx.lineWidth = hubActive ? 1.5 : 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isFailed) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '800 11px ui-monospace, Menlo, monospace';
        ctx.fillText('MISS', cx, cy - 7);
        ctx.fillStyle = '#fca5a5';
        ctx.font = '700 10px ui-monospace, Menlo, monospace';
        ctx.fillText(`${st.missDegrees}°`, cx, cy + 8);
      } else if (st.hubStatusTimer > 0) {
        ctx.fillStyle = st.hubStatusColor || theme.bright;
        ctx.font = '800 11px ui-monospace, Menlo, monospace';
        ctx.fillText(st.hubStatusText, cx, cy);
      } else {
        ctx.fillStyle = isIlluminated ? theme.bright : '#9ca3af';
        ctx.font = '800 11px ui-monospace, Menlo, monospace';
        let centerText = 'READY';
        if (st.phase === 'PLAYING') {
          centerText = st.lessonSlowActive ? 'SLOW 0.35×' : st.direction === 1 ? 'CW ↻' : 'CCW ↺';
        } else if (st.phase === 'PAUSED') {
          centerText = 'PAUSED';
        }
        ctx.fillText(centerText, cx, cy);
      }

      // Striker Needle & Pointer Tip
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

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#050608] px-4 py-3">
      {/* Song Progress Bar */}
      <div className="z-10 mb-2 flex w-[min(88vw,460px)] flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-[#9ca3af] tabular-nums">
          <span className="truncate pr-2">{songHudTitle}</span>
          <span className="shrink-0">{songTimerText}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-sm border border-[#222733] bg-[#141820]">
          <div
            className="h-full bg-[var(--theme-primary)] transition-[width] duration-100 ease-linear"
            style={{ width: `${songProgressPct.toFixed(1)}%` }}
          />
        </div>
      </div>

      {/* Live Score, Streak & Multiplier Strip */}
      <div className="z-10 mb-2 flex items-baseline justify-center gap-6 sm:gap-9">
        <div className="flex min-w-[82px] flex-col items-center">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#6b7280]">Score</span>
          <span className="tabular-nums text-3xl sm:text-4xl font-extrabold leading-tight text-[#f3f4f6]">
            {score.toLocaleString()}
          </span>
        </div>
        <div className="flex min-w-[66px] flex-col items-center">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#6b7280]">Combo</span>
          <span className="tabular-nums text-xl font-bold leading-tight text-[#d1d5db]">
            {streak}x
          </span>
        </div>
        <div className="flex min-w-[66px] flex-col items-center">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#6b7280]">Mult</span>
          <span className="tabular-nums text-xl font-bold leading-tight text-[var(--theme-bright)]">
            {totalMult.toFixed(2)}x
          </span>
        </div>
        <div className="hidden sm:flex min-w-[66px] flex-col items-center">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#6b7280]">Best</span>
          <span className="tabular-nums text-xl font-bold leading-tight text-[#9ca3af]">
            {bestScore.toLocaleString()}
          </span>
        </div>
      </div>

      {/* High-DPI Dial Canvas */}
      <div
        ref={wrapRef}
        className="relative flex h-[min(68vw,46vh,390px)] w-[min(68vw,46vh,390px)] items-center justify-center"
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

        {/* In-Song Slow-Motion Tutorial Highlight Callout */}
        {activeLesson && (
          <div className="pointer-events-auto absolute -bottom-2 left-1/2 z-20 w-[min(92vw,360px)] -translate-x-1/2 rounded-lg border border-[#fde047] bg-[#0c0e12] px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="tabular-nums text-[10px] font-extrabold tracking-widest uppercase text-[#fde047]">
                Slow-Motion Lesson · {activeLesson.title}
              </span>
              <button
                type="button"
                onClick={onSkipTutorial}
                className="text-[10px] font-bold text-[#9ca3af] hover:text-white underline cursor-pointer"
              >
                Skip Guide
              </button>
            </div>
            <p className="mt-1 text-xs leading-snug text-[#f3f4f6]">{activeLesson.instruction}</p>
          </div>
        )}
      </div>

      {/* Tutorial Complete Banner Stripe */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed left-0 right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center justify-center gap-1 border-y-2 border-[var(--theme-primary)] bg-[#0c0e12] py-4 px-5 transition-all duration-200 ${
          showTutorialCompleteStripe ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
        }`}
      >
        <span className="tabular-nums text-[11px] font-extrabold tracking-[0.2em] uppercase text-[var(--theme-bright)]">
          Calibration Verified
        </span>
        <span className="font-display text-2xl font-black tracking-[0.14em] uppercase text-[#f3f4f6]">
          Tutorial Complete
        </span>
        <span className="text-xs text-[#9ca3af]">
          Normal Difficulty &amp; 4 Newgrounds Tracks Unlocked
        </span>
      </div>

      {/* Footer Wave & Streak Telemetry */}
      <footer className="z-10 mt-3 flex min-h-[44px] flex-col items-center gap-1.5 text-center">
        <p className="text-xs font-medium text-[#d1d5db] max-w-[92vw]">{promptHint}</p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-bold tracking-wider uppercase text-[#6b7280] tabular-nums">
          <span style={{ color: modeColor }}>{modeName}</span>
          <span aria-hidden="true">·</span>
          <span>Combo {streakMult.toFixed(1)}x</span>
          {shields > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[var(--theme-bright)]">Shield x{shields}</span>
            </>
          )}
          {isTutorialRun && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#fbbf24]">Tutorial Shield: {tutorialLives} Lives</span>
            </>
          )}
        </div>
      </footer>
    </main>
  );
};

// Re-export helper so callers can look up wave mode display info easily
export function getWaveModeMeta(modeId: WaveModeId) {
  return WAVE_MODES.find((m) => m.id === modeId) || WAVE_MODES[0];
}
