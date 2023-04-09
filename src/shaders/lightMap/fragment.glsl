varying vec2 vUv;
uniform float uTime;

uniform sampler2D uBakedTexture;
uniform sampler2D uLightMapTexture;

uniform float uPortalStrenght;
uniform vec3 uColor;

uniform float uPoleStrenght;
uniform vec3 uPoleColor;

void main()
{
  vec3 bakedColor = texture2D(uBakedTexture, vUv).rgb;
  vec3 lightMapColor = texture2D(uLightMapTexture, vUv).rgb;

  bakedColor = mix(bakedColor, uColor, lightMapColor.r * uPortalStrenght);
  bakedColor = mix(bakedColor, uPoleColor, lightMapColor.g * uPoleStrenght);

  gl_FragColor = vec4(bakedColor, 1.0);
}