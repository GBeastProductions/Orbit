# ORBIT Asset Quality Review

## Protected
- All files in gui/backgrounds/ are protected. The selected track/stage photography is the strongest existing direction and was not modified, recompressed, renamed, or removed.
- Everything in aistudio/ is protected. Existing audio was not touched.
- songs/ remains empty except for .gitkeep.
- Font files and their license notices are retained.

## Kept from Hydrogen's additions
- Space Grotesk, IBM Plex Mono, and Zen Kaku Gothic New with their license files: strong typographic foundation.
- Lucide icons and ISC license: keep for small functional controls, not as hero artwork.
- Existing panel SVG primitives: useful construction pieces, but do not use every panel style at once.
- Acoustic weave and brushed-metal color textures: retain as optional, low-opacity surface references.
- Neon photo-studio panorama: retained as a possible 3D environment reference.
- Existing shader examples and their MIT notices: retained as research/reference code, not assumed to be compatible with the current renderer.
- Clean ring, flare, slash, and trace masks in HUD effects: retained as optional hit-feedback primitives.
- Check/cross judgment symbols and star marks: retained as utility glyphs.

## Removed as weak or off-theme
- Beige paper grain and distressed blue-metal texture: too warm/grungy for the restrained dark arcade palette.
- Unrelated blue and neutral photo-studio environment panoramas: no strong connection to the selected stage/background direction.
- Opaque white lighting masks and fan/streak silhouettes: poor light falloff and little value as actual 2D lighting assets.
- Yellow explosion, lightning-cloud, smoke-puff, and splatter particles: read as generic combat/fantasy effects, not music-synchronized rhythm feedback.
- Generic FPS crosshair/reticle collection and oversized medal/rank sprite collections: too tactical/game-template-like and visually noisy for the orbital timing language.

## New ORBIT-specific additions
Original editable SVG motifs, HUD frames and judgments, beat markers, lighting overlays, particle sprites, and three optional GLSL post-processing candidates have been added. They use a consistent palette and simple geometry, with no AI-generated raster imagery.

## Quality bar used
A visual was retained only when its shape language, lighting/material logic, palette, resolution/edge quality, and likely in-game role were clear. AI-image detection is not reliable from a single visual cue; the practical rejection signals here are incoherent geometry, inconsistent lighting, fake-looking texture, unnecessary complexity, and generic decoration without gameplay purpose.