/** Identical deformation in color and shadow passes; instance roots stay fixed. */
export function addTreeWind(shader: { vertexShader: string; uniforms: Record<string, unknown> },
  time: { value: number }, height: number) {
  shader.uniforms.treeWindTime = time;
  shader.uniforms.treeModelHeight = { value: height };
  shader.vertexShader = 'uniform float treeWindTime, treeModelHeight;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    vec3 windRoot = instanceMatrix[3].xyz;
    float windPhase = dot(windRoot.xz,vec2(.173,.219));
    float crown = smoothstep(.32,.92,position.y/treeModelHeight);
    float tips = smoothstep(.55,1.,position.y/treeModelHeight);
    float gust = .35 + .65*pow(.5+.5*sin(treeWindTime*.47+windPhase*.13),2.);
    float bend = sin(treeWindTime*1.15+windPhase)*.11*gust*crown*crown;
    float flutter = sin(treeWindTime*2.4+position.x*.8+position.z*.7+windPhase)*.035*tips*gust;
    // Small displacement, not a rigid rotation of the whole tree or its collider.
    transformed.x += bend + flutter;
    transformed.z += bend*.53 + sin(treeWindTime*.91+windPhase)*.045*crown*gust;
  `);
}
