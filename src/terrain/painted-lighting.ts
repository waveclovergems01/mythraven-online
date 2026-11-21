/** Soft toon response for painted PBR surfaces. Preserve texture hue, real shadows
 * and night lighting; soften highlights without baking light into source assets. */
export function softenPaintedLighting(shader: { fragmentShader: string }) {
  shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>
    vec3 paintedDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
    float paintedAlbedo = max(dot(diffuseColor.rgb, vec3(.2126,.7152,.0722)), .01);
    float paintedLight = dot(paintedDiffuse, vec3(.2126,.7152,.0722)) / paintedAlbedo;
    // Broad, softly connected shade/midtone/light bands. Fade to black at night,
    // rather than imposing a constant ambient floor on every material.
    float paintedBands = (.30 + .32*smoothstep(.25,.60,paintedLight)
      + .34*smoothstep(.70,1.15,paintedLight)
      + .18*smoothstep(1.35,2.0,paintedLight)) * smoothstep(0.,.22,paintedLight);
    float paintedGain = mix(paintedLight, paintedBands, .65) / max(paintedLight,.001);
    reflectedLight.directDiffuse *= paintedGain;
    reflectedLight.indirectDiffuse *= paintedGain;
    reflectedLight.directSpecular *= .25;
    reflectedLight.indirectSpecular *= .25;
  `);
}
