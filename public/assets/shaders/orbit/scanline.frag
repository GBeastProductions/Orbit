precision mediump float;
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float intensity;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  float line = 0.94 + 0.06 * sin(vUv.y * resolution.y * 3.14159265);
  float vignette = 1.0 - smoothstep(0.25, 0.85, distance(vUv, vec2(0.5)));
  color.rgb *= mix(1.0, line * vignette, clamp(intensity, 0.0, 1.0));
  gl_FragColor = color;
}