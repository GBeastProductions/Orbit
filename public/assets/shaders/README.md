# Shader and Post-Processing Library

Keep shader sources separate from GUI artwork. Every shader needs a source/author/license note, renderer requirements, tested browser/GPU notes, and a fallback.

## Human-authored source shortlist

### lostjared / shaders
- Source: https://github.com/lostjared/shaders
- License: MIT (retain copyright and permission notice).
- Description: a large collection of GLSL shader effects.
- Use: research candidates for scanline, distortion, blur, and stylized effects. Review each shader's original attribution and adapt only shaders that suit ORBIT's rendering stack.
- License file: https://github.com/lostjared/shaders/blob/main/LICENSE

### Three.js official examples
- Source: https://threejs.org/examples/
- Source repository: https://github.com/mrdoob/three.js
- License: MIT; preserve the license notice when redistributing source.
- Relevant examples to study: Unreal Bloom, Afterimage, Glitch, RGB Halftone, God Rays, custom BufferGeometry particles, and Points.
- These are examples/reference implementations, not drop-in React components. They require a compatible Three.js renderer and careful performance testing.

## ORBIT shader priorities
1. Subtle scanline / CRT texture as an optional theme treatment.
2. Controlled bloom for hit flashes and emissive accents.
3. Short afterimage trails for high-combo feedback.
4. Light chromatic separation only for rare transitions, never as a permanent readability tax.
5. Audio-reactive background modulation with a strict amplitude cap.

## Compatibility gate
Before importing a shader, confirm the project uses WebGL/Three.js or another compatible shader host. A GLSL file will not run in a normal DOM element or Canvas 2D context. Keep a CSS/Canvas fallback and honor reduced motion.
