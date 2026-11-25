# Lighting and Light Assets

## Keep / use
- env_neon_photostudio.jpg: the only current photographic environment panorama that strongly supports the electronic/arcade stage direction. Use only as an optional 3D environment map; it is not a 2D overlay.
- 2d/: original transparent SVG lighting overlays. Use radial-stage and edge-wash at low opacity; spotlight-cone and lens-streak only for short stage moments; orbit-halo as a restrained focal accent.

## Integration rules
ORBIT is a React/Vite rhythm game. Do not assume it has a real-time 3D renderer. CSS gradients, Canvas 2D compositing, and WebGL shaders are different systems. Keep dark areas dark enough for note contrast. Bloom only emissive highlights, cap intensity, and honor reduced-motion settings.

The generic white masks formerly in this folder were removed because they were mostly opaque geometric silhouettes rather than useful light textures. The two unrelated studio panoramas were removed; the neon studio panorama was retained. All original track backgrounds remain untouched.