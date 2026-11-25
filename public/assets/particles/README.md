# ORBIT Particle and VFX Library

## ORBIT-specific vector effects
The orbit/ folder contains small, sharply defined SVG sprites designed for note hits, combo milestones, and beat accents: diamond-spark, four-point-star, ring-burst, dash-cluster, beat-confetti, and arc-spark. They are intentionally geometric and palette-limited so they can be tinted or scaled without turning the screen into generic fantasy magic.

## External artist-made references
- Kenney Particle Pack — https://kenney.nl/assets/particle-pack — CC0 1.0.
- Kenney Smoke Particles — https://kenney.nl/assets/smoke-particles — CC0 1.0; atmospheric puffs only, not a core effect.
- Kenney Splat Pack — https://kenney.nl/assets/splat-pack — CC0 1.0; use only after checking individual shapes.

## Runtime rules
Use short effects (roughly 100–350 ms), synchronize them to gameplay events, pool Canvas/WebGL objects, cap simultaneous particles on mobile, and never obscure notes or judgments. Respect prefers-reduced-motion.

The yellow explosion/smoke/splat effects were removed from the active library because they read as generic fantasy/combat VFX rather than ORBIT's clean electronic rhythm language. The existing track backgrounds were not touched.