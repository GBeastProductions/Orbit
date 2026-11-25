# Particle and VFX Library

Prefer real artist-authored sprite sheets and alpha textures over procedural-looking AI imagery. Use effects sparingly: note hits, combo milestones, menu transitions, and beat accents.

## Human-made, license-cleared sources

### Kenney — Particle Pack
- Source: https://kenney.nl/assets/particle-pack
- Creator: Kenney.
- License: CC0 1.0.
- Contents: 80 particle/light/shader sprites, listed at 512 × 512.
- Suitable for: sparks, soft glows, light masks, small hit bursts.
- The official page lists CC0 and the pack is also listed as containing no generative AI on Kenney's bundle page.
- Asset page: https://kenney.nl/assets/particle-pack

### Kenney — Smoke Particles
- Source: https://kenney.nl/assets/smoke-particles
- Creator: Kenney.
- License: CC0 1.0.
- Contents: 70 particle sprites.
- Suitable for: very restrained atmospheric puffs; likely not a core ORBIT effect.
- Asset page: https://kenney.nl/assets/smoke-particles

### Kenney — Splat Pack
- Source: https://kenney.nl/assets/splat-pack
- Creator: Kenney.
- License: CC0 1.0.
- Contents: 30 VFX textures.
- Suitable for: selected impact masks only, after visual review.
- Asset page: https://kenney.nl/assets/splat-pack

Kenney's support page confirms its game assets are CC0 and may be used in commercial projects: https://kenney.nl/support

## Integration notes
- Recolor only after checking source alpha and edge quality.
- Use additive/screen blending only for light-emitting effects.
- Cap simultaneous particles on mobile and pool Canvas/WebGL objects.
- Keep effects short (roughly 100–350 ms for hit feedback) and synchronized to actual gameplay events.
- Respect `prefers-reduced-motion`; never let particles hide notes or judgments.

## Import status
Source packs are catalogued here, not copied into the repository yet. Download from the original creator pages and preserve the license/source record before committing selected files.
