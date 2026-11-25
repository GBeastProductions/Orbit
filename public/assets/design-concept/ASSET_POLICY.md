# Asset Provenance and Quality Policy

ORBIT prefers assets made by identifiable human artists or established human-led studios. Do not add AI-generated art, scraped image collections, uncredited reposts, or files with unclear redistribution rights.

For every imported asset, record:
- Asset name and exact source page.
- Creator / studio.
- License and link to the license text.
- Original filename and local filename.
- Any edits, crops, color changes, or conversions.
- Intended ORBIT use and runtime format.

A free download is not automatically redistributable. A pack license must explicitly allow redistribution inside a game or shipped product. Keep source archives outside the public runtime unless individual files are cleared for redistribution.

## Runtime discipline
- Prefer SVG for interface icons and crisp 2D marks.
- Prefer optimized PNG/WebP for particle sprites and transparent effects.
- Prefer small seamless textures; avoid shipping huge source maps when a downscaled derivative is sufficient.
- Keep HDRI/EXR assets out of the web build unless the renderer actually supports and needs them.
- Do not add a dependency or shader pipeline until the current rendering path is confirmed compatible.
