# Lighting and Light Assets

This folder is for browser-usable lighting references and approved environment-light assets. ORBIT is currently a React/Vite rhythm game; do not assume it has a real-time 3D renderer. CSS gradients, Canvas 2D compositing, and WebGL shaders are different systems. Integrate only what the active renderer can use.

## Human-made source shortlist

### Poly Haven — HDRIs and textures
- Source: https://polyhaven.com/
- License: CC0 1.0 for its asset library; commercial use and redistribution are permitted.
- Provenance: original work by Poly Haven staff and contributing artists; the site describes its assets as handcrafted and says it avoids generative AI.
- Best use: optional HDR environment maps if a 3D scene is introduced, or carefully selected texture maps for a future visualizer.
- License: https://polyhaven.com/license
- Do not ship 8K/16K source maps in a browser build. Choose an appropriate resolution and format after renderer review.

### ambientCG — material textures
- Source: https://ambientcg.com/
- License: CC0 1.0; its license documentation explicitly permits use in games and commercial projects.
- Best use: subtle surface textures or material maps if a 3D layer is added.
- License: https://docs.ambientcg.com/license/
- Avoid importing realistic materials that conflict with ORBIT's clean graphic direction.

## Lighting direction for ORBIT
- Use pink/cyan edge accents as motivated light, not ambient fog everywhere.
- Keep dark backgrounds dark enough for note contrast.
- Use bloom only on emissive highlights and cap intensity.
- Prefer soft radial gradients for 2D stage ambience; do not simulate 3D lighting where it adds no gameplay value.

## Import status
This is a curated source register, not a claim that third-party binary files have already been downloaded into this folder. Add each selected file with a matching entry in `../CREDITS_AND_LICENSES.md`.
