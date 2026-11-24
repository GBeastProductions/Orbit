import React from 'react';
import { BgFxMode, LevelBackgroundSetting } from '../types/game';

interface BackgroundBackdropProps {
  defaultImageUrl: string;
  levelSetting?: LevelBackgroundSetting;
  bgFxMode: BgFxMode;
  forceDimPct?: number;
  forceBlurPx?: number;
}

export const BackgroundBackdrop: React.FC<BackgroundBackdropProps> = React.memo(
  ({ defaultImageUrl, levelSetting, bgFxMode, forceDimPct, forceBlurPx }) => {
    const imageSrc = levelSetting?.customImageDataUrl || defaultImageUrl;
    const dimPct = forceDimPct !== undefined ? forceDimPct : levelSetting?.dimPct ?? 68;
    const blurPx = forceBlurPx !== undefined ? forceBlurPx : levelSetting?.blurPx ?? 4;

    return (
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608] isolate"
        aria-hidden="true"
      >
        {imageSrc && (
          <img
            src={imageSrc}
            alt=""
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            style={{
              filter: bgFxMode === 'minimal' || blurPx <= 0 ? 'none' : `blur(${blurPx}px)`,
              transform:
                blurPx > 0 && bgFxMode !== 'minimal'
                  ? 'translate3d(0,0,0) scale(1.06)'
                  : 'translate3d(0,0,0) scale(1)',
              willChange: 'transform',
            }}
          />
        )}

        {/* Programmable background dim scrim */}
        <div
          className="absolute inset-0 bg-[#050608] transition-opacity duration-200"
          style={{ opacity: Math.min(0.97, Math.max(0, dimPct / 100)) }}
        />

        {/* Retro arcade subtle grid & scanlines */}
        {bgFxMode === 'dynamic' && (
          <>
            <div className="arcade-grid absolute inset-0 opacity-45" />
            <div className="arcade-scanlines absolute inset-0 opacity-60" />
          </>
        )}
      </div>
    );
  },
);
