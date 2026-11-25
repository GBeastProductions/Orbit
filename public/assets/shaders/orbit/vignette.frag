precision mediump float;
uniform sampler2D tDiffuse;
uniform float amount;
uniform vec3 tint;
varying vec2 vUv;
void main() {
  vec4 source = texture2D(tDiffuse, vUv);
  vec2 p = (vUv - 0.5) * vec2(1.0, 0.88);
  float edge = smoothstep(0.25, 0.82, length(p));
  vec3 shaded = mix(source.rgb, source.rgb * tint, edge * clamp(amount, 0.0, 0.65));
  gl_FragColor = vec4(shaded, source.a);
}