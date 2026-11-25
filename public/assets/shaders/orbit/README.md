# ORBIT Post-Processing Candidates

These are small original GLSL ES fragment-shader candidates, kept separate from application code. They are not automatically active and are not drop-in CSS effects.

- scanline.frag: restrained CRT line treatment with a mild vignette. Uniforms: tDiffuse, resolution, intensity.
- halftone.frag: subtle low-resolution dot treatment. Uniforms: tDiffuse, resolution, strength, dotScale.
- vignette.frag: controlled edge tint. Uniforms: tDiffuse, amount, tint.

Each shader expects a fullscreen pass with vUv and tDiffuse supplied by a compatible WebGL pipeline. Test on low-end mobile hardware, clamp effect strength, provide a non-shader fallback, and disable or reduce effects for prefers-reduced-motion and reduced-power settings. The game currently uses React/Vite; confirm an actual WebGL post-processing host before integration.