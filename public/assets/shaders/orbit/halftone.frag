precision mediump float;
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float strength;
uniform float dotScale;
varying vec2 vUv;
void main() {
  vec4 source = texture2D(tDiffuse, vUv);
  float cell = max(dotScale, 2.0);
  vec2 pixel = floor(vUv * resolution / cell) * cell;
  vec2 center = (pixel + vec2(cell * 0.5)) / resolution;
  float luminance = dot(texture2D(tDiffuse, center).rgb, vec3(0.2126, 0.7152, 0.0722));
  vec2 local = fract(vUv * resolution / cell) - 0.5;
  float radius = (1.0 - luminance) * 0.48;
  float dotMask = 1.0 - smoothstep(radius - 0.04, radius + 0.04, length(local));
  vec3 ink = source.rgb * (1.0 - dotMask * clamp(strength, 0.0, 0.35));
  gl_FragColor = vec4(ink, source.a);
}