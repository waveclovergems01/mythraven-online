import * as THREE from 'three';

export const LEVEL_UP_DURATION_MS = 580;

const surfaceVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

const floorFragment = `
varying vec2 vUv;
uniform float age, lifetime;
float ring(float r, float edge, float width) {
  float offset = (r - edge) / width;
  return exp(-offset * offset);
}
void main() {
  float t = clamp(age / lifetime, 0., 1.);
  vec2 point = 2. * vUv - 1.;
  float r = length(point);
  float angle = atan(point.y, point.x) - t * 3.5;
  float edge = mix(.11, .85, 1. - pow(1. - t, 2.8));
  float rosette = edge * (.69 + .11 * cos(angle * 6.));
  float spokes = pow(max(0., cos(angle * 12.)), 7.);
  float outer = ring(r, edge, .009) + .55 * ring(r, edge * .91, .008);
  float glyphs = ring(r, rosette, .009) + spokes * ring(r, edge * .82, .038) * .47;
  float halo = .27 * ring(r, edge * .8, .11) + .7 * exp(-r * r * 41.);
  float fade = smoothstep(0., .07, t) * (1. - smoothstep(.63, 1., t));
  gl_FragColor = vec4(1., .68 + .26 * min(1., glyphs + outer), .23 + .38 * min(1., outer), min(1., outer + glyphs + halo) * fade);
}`;

const beamFragment = `
varying vec2 vUv;
uniform float age;
uniform float lifetime;
void main() {
  float progress = clamp(age / lifetime, 0., 1.);
  float height = vUv.y;
  float x = vUv.x * 2. - 1.;
  float front = smoothstep(0., .43, progress) * 1.25;
  float shaft = exp(-abs(x) * 12.);
  float streaks = pow(.5 + .5 * sin(x * 42. + progress * 8.), 5.) * exp(-abs(x) * 3.5);
  float tip = 1. - smoothstep(front - .29, front + .03, height);
  float fade = smoothstep(.02, .14, progress) * (1. - smoothstep(.45, 1., progress));
  float pool = exp(-abs(x) * 4.5 - height * 16.);
  float alpha = (shaft + streaks * .47 + pool * .75) * (1. - smoothstep(.7, 1., height)) * tip * fade;
  vec3 gold = mix(vec3(1., .57, .15), vec3(1., .97, .75), min(1., shaft + pool));
  gl_FragColor = vec4(gold, min(1., alpha));
}`;

const baseFragment = `
varying vec2 vUv;
uniform float age, lifetime, phase;
void main() {
  float t = clamp(age / lifetime, 0., 1.);
  vec2 p = vUv * 2. - 1.;
  float radius = length(p);
  float angle = atan(p.y, p.x) - phase - t * 5.;
  float swell = mix(.24, .79, smoothstep(0., .42, t));
  float arc = (radius - swell) / .16;
  float halo = exp(-radius * radius * 7.) * .48;
  float wisps = exp(-arc * arc) * (.16 + .42 * pow(.5 + .5 * cos(angle * 4. + radius * 12.), 2.));
  float fade = smoothstep(0., .13, t) * (1. - smoothstep(.58, 1., t));
  gl_FragColor = vec4(1., .55, .14, (halo + wisps) * fade);
}`;

const edgeBeamVertex = `
attribute vec4 column;
attribute vec2 timing;
varying vec2 vUv;
varying float progress;
uniform float age;
void main() {
  vUv = uv;
  progress = clamp((age - timing.x) / timing.y, 0., 1.);
  float height = uv.y;
  float bend = height * (.17 + .10 * sin(height * 5.8 - progress * 5.));
  float angle = column.x + bend;
  vec3 p = vec3(cos(angle) * column.y, height * column.z, sin(angle) * column.y);
  vec4 view = modelViewMatrix * vec4(p, 1.);
  view.x += position.x * column.w * mix(1., .49, height);
  gl_Position = projectionMatrix * view;
}`;

const edgeBeamFragment = `
varying vec2 vUv;
varying float progress;
void main() {
  float x = abs(vUv.x * 2. - 1.);
  float head = smoothstep(0., .57, progress) * 1.13;
  float tail = smoothstep(.21, 1., progress) * 1.22;
  float leadingEdge = 1. - smoothstep(head - .19, head, vUv.y);
  float trailingEdge = smoothstep(tail - .22, tail + .06, vUv.y);
  float falloff = 1. - smoothstep(.79, 1., vUv.y);
  float inner = exp(-x * x * 16.);
  float halo = .35 * (1. - smoothstep(.12, 1., x));
  float fade = smoothstep(0., .12, progress) * (1. - smoothstep(.76, 1., progress));
  vec3 gold = mix(vec3(1., .54, .13), vec3(1., .9, .48), inner);
  gl_FragColor = vec4(gold, min(1., inner + halo) * leadingEdge * trailingEdge * falloff * fade * .7);
}`;

const spiralVertex = `
attribute vec4 ribbon;
varying vec2 vUv;
varying float progress;
uniform float age;
vec3 ribbonCenter(float h) {
  float angle = ribbon.x + h * ribbon.w;
  float radius = mix(1.95, .83, h * h) * ribbon.z;
  return vec3(cos(angle) * radius, .02 + h * 3.05, sin(angle) * radius);
}
void main() {
  vUv = uv;
  progress = clamp(age / ribbon.y, 0., 1.);
  float h = uv.y;
  vec4 center = modelViewMatrix * vec4(ribbonCenter(h), 1.);
  vec4 ahead = modelViewMatrix * vec4(ribbonCenter(h + .008), 1.);
  vec2 tangent = ahead.xy - center.xy;
  // Give each ribbon a readable silhouette even when its helix turns edge-on.
  vec2 normal = normalize(vec2(-tangent.y, tangent.x) + vec2(.00001, 0.));
  float taper = .24 + .76 * sin(3.14159 * h);
  center.xy += normal * (uv.x - .5) * mix(.85, .35, h) * taper;
  gl_Position = projectionMatrix * center;
}`;

const spiralFragment = `
varying vec2 vUv;
varying float progress;
void main() {
  float h = vUv.y;
  float x = 2. * vUv.x - 1.;
  float crest = x - .13 * sin(h * 12. - progress * 8.);
  float core = exp(-crest * crest * 38.);
  float filament = exp(-abs(x + .43) * 26.);
  float glow = .47 * (1. - smoothstep(.06, 1., abs(x)));
  float head = smoothstep(.02, .66, progress) * 1.10;
  float ascent = 1. - smoothstep(head - .14, head, h);
  // The back of each stroke fades upwards after its leading edge leaves the floor.
  float trailingEdge = smoothstep(.28, 1., progress) * 1.16;
  float tail = smoothstep(trailingEdge - .16, trailingEdge + .07, h);
  float fade = smoothstep(.02, .14, progress) * (1. - smoothstep(.78, 1., progress));
  float tip = smoothstep(0., .07, h) * (1. - smoothstep(.89, 1., h));
  vec3 gold = mix(vec3(1., .51, .09), vec3(1., .93, .65), core);
  gl_FragColor = vec4(gold, min(1., core + glow + .43 * filament) * ascent * tail * fade * tip);
}`;

const particleVertex = `
attribute vec4 burst;
attribute vec4 motion;
uniform float age;
uniform vec4 emission;
varying vec2 vUv;
varying float life, variation;
void main() {
  vUv = uv;
  variation = motion.z;
  float t = clamp((age - burst.z) / motion.x, 0., 1.);
  life = smoothstep(0., .12, t) * (1. - smoothstep(.62, 1., t));
  float spread = mix(mix(.12, 1., 1. - pow(1. - t, 2.)), .5 + .5 * t, emission.w);
  float distance = emission.x * spread * burst.y;
  float lifted = emission.y * mix(2.4 * t - 1.5 * t * t, t, emission.w) * motion.w;
  float direction = burst.x + emission.w * t * 1.6 * motion.y;
  vec3 center = vec3(cos(direction) * distance, .12 + lifted, sin(direction) * distance);
  vec4 view = modelViewMatrix * vec4(center, 1.);
  float spin = burst.x + t * 8. * motion.y;
  vec2 corner = position.xy * emission.z * burst.w * vec2(mix(.7,1.2,variation),mix(1.19,.79,variation));
  view.xy += mat2(cos(spin), sin(spin), -sin(spin), cos(spin)) * corner;
  gl_Position = projectionMatrix * view;
}`;

const particleLayers = [
  {name:'gold-sparks',count:88,emission:[3.8,5.6,.14,0],minLife:.8,glow:true,shape:`
    float core = exp(-dot(p,p) * 9.);
    float ray = exp(-min(abs(p.x),abs(p.y)) * 22. - length(p) * 4.);
    float alpha = min(1., core + ray);
    vec3 color = mix(vec3(1.,.56,.12),vec3(1.,.96,.72),core);
  `},
  {name:'rising-dust',count:92,emission:[2.7,5.4,.105,1],minLife:.8,glow:true,shape:`
    float alpha = exp(-dot(p,p) * (5. + 5. * variation));
    vec3 color = mix(vec3(1.,.59,.19),vec3(1.,.93,.66),variation);
  `},
  {name:'green-leaves',count:24,emission:[2.31,4.1,.38,0],minLife:.7,glow:false,shape:`
    float leaf = abs(p.y - p.x * mix(-.1,.21,variation)) / max(.02,mix(.27,.48,variation) * (1. - p.x * p.x));
    float alpha = (1. - smoothstep(.78,1.,leaf)) * (1. - smoothstep(.75,1.,abs(p.x)));
    float vein = exp(-abs(p.y - p.x * .14) * 32.);
    vec3 color = mix(vec3(.39,.62,.08),vec3(1.,.92,.31),vein * .55 + .36 * variation);
  `},
  {name:'pink-petals',count:25,emission:[2.59,5.5,.36,0],minLife:.7,glow:false,shape:`
    float petal = length(vec2((p.x - .1) * .93,p.y * (mix(1.3,1.96,variation) - .42 * p.x)));
    float alpha = (1. - smoothstep(.78,1.,petal)) * smoothstep(-.97,-.76,p.x);
    vec3 color = mix(vec3(.92,.31,.54),vec3(1.,.86,.83),smoothstep(-.65,.7,p.x + p.y * .5));
  `},
] as const;

function instancedPlane(plane:THREE.PlaneGeometry,count:number){
  const geometry=new THREE.InstancedBufferGeometry();
  geometry.setIndex(plane.index!.clone());
  geometry.setAttribute('position',plane.getAttribute('position').clone());
  geometry.setAttribute('uv',plane.getAttribute('uv').clone());
  geometry.instanceCount=count;
  return geometry;
}

export function createLevelUpAura(scene:THREE.Scene){
  const age={value:0};
  const group=new THREE.Group();
  group.name='level-up-aura';
  group.visible=false;
  scene.add(group);

  function layer(name:string,geometry:THREE.BufferGeometry,vertexShader:string,fragmentShader:string,glow=true,
    uniforms:Record<string,THREE.IUniform>={}){
    const material=new THREE.ShaderMaterial({
      uniforms:{...uniforms,age},vertexShader,fragmentShader,
      transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,
      blending:glow?THREE.AdditiveBlending:THREE.NormalBlending,
    });
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=name;
    mesh.frustumCulled=false;
    group.add(mesh);
    return mesh;
  }
  const groundLife={value:1},baseLife={value:1},basePhase={value:0},beamLife={value:1};
  const ground=layer('ground-rings',new THREE.PlaneGeometry(7,7),surfaceVertex,floorFragment,true,{lifetime:groundLife});
  ground.rotation.x=-Math.PI/2;
  const base=layer('base-glow',new THREE.PlaneGeometry(7,7),surfaceVertex,baseFragment,true,{lifetime:baseLife,phase:basePhase});
  base.rotation.x=-Math.PI/2;
  const beam=layer('light-column',new THREE.PlaneGeometry(4.4,6).translate(0,3,0),surfaceVertex,beamFragment,true,{lifetime:beamLife});
  const maxRibbons=4;
  const ribbon=new THREE.PlaneGeometry(1,1,1,32);
  const spiralGeometry=instancedPlane(ribbon,maxRibbons);
  ribbon.dispose();
  const ribbons=new THREE.InstancedBufferAttribute(new Float32Array(maxRibbons*4),4);
  spiralGeometry.setAttribute('ribbon',ribbons);
  const spiral=layer('gold-spiral',spiralGeometry,spiralVertex,spiralFragment);

  const edgeStrip=new THREE.PlaneGeometry(1,1,1,24);
  const edgeGeometry=instancedPlane(edgeStrip,18);
  edgeStrip.dispose();
  const columns=new THREE.InstancedBufferAttribute(new Float32Array(edgeGeometry.instanceCount*4),4);
  const columnTiming=new THREE.InstancedBufferAttribute(new Float32Array(edgeGeometry.instanceCount*2),2);
  edgeGeometry.setAttribute('column',columns);
  edgeGeometry.setAttribute('timing',columnTiming);
  const edgeBeams=layer('edge-beams',edgeGeometry,edgeBeamVertex,edgeBeamFragment);

  const quad=new THREE.PlaneGeometry(1,1);
  const particles=particleLayers.map(({name,count,emission,minLife,glow,shape})=>{
    const geometry=instancedPlane(quad,count);
    const burst=new THREE.InstancedBufferAttribute(new Float32Array(count*4),4);
    const motion=new THREE.InstancedBufferAttribute(new Float32Array(count*4),4);
    geometry.setAttribute('burst',burst);
    geometry.setAttribute('motion',motion);
    const mesh=layer(name,geometry,particleVertex,`
      varying vec2 vUv;
      varying float life, variation;
      void main(){
        vec2 p = vUv * 2. - 1.;
        ${shape}
        gl_FragColor = vec4(color, alpha * life);
      }`,glow,{emission:{value:new THREE.Vector4(...emission)}});
    return {mesh,burst,motion,minLife};
  });
  quad.dispose();

  let startedAt=-Infinity;
  return {
    play(){
      const random=THREE.MathUtils.randFloat,tau=2*Math.PI,phase=random(0,tau);
      groundLife.value=random(.8,1);
      baseLife.value=random(.8,1);
      beamLife.value=random(.8,1);
      basePhase.value=phase;
      spiralGeometry.instanceCount=THREE.MathUtils.randInt(3,maxRibbons);
      const direction=Math.random()<.5?-1:1;
      for(let i=0;i<spiralGeometry.instanceCount;i++){
        const startAngle=phase+i*tau/spiralGeometry.instanceCount+random(-.23,.23);
        const sweep=direction*THREE.MathUtils.degToRad(random(40,50));
        ribbons.setXYZW(i,startAngle,random(.8,1),random(.87,1.14),sweep);
      }
      ribbons.needsUpdate=true;
      for(let i=0;i<columns.count;i++){
        const lifetime=random(.8,1);
        columns.setXYZW(i,phase+i*2.39996+random(-.3,.3),1.05+1.9*(i+Math.random())/columns.count,random(2.5,5.1),random(.58,.98));
        columnTiming.setXY(i,random(0,1-lifetime),lifetime);
      }
      columns.needsUpdate=true;
      columnTiming.needsUpdate=true;
      for(const {burst,motion,minLife} of particles){
        for(let i=0;i<burst.count;i++){
          const lifetime=random(minLife,1);
          burst.setXYZW(i,random(0,tau),random(.57,1.37),random(0,Math.min(.14,1-lifetime)),random(.66,1.58));
          motion.setXYZW(i,lifetime,random(-1.2,1.2),Math.random(),random(.63,1.4));
        }
        burst.needsUpdate=true;
        motion.needsUpdate=true;
      }
      startedAt=performance.now();
    },
    update(now:number,position:THREE.Vector3,camera:THREE.Camera,reducedMotion:boolean){
      const progress=Math.max(0,(now-startedAt)/LEVEL_UP_DURATION_MS);
      group.visible=progress<1;
      if(!group.visible)return;
      group.position.copy(position);group.position.y+=.09;
      age.value=progress;
      beam.rotation.y=Math.atan2(camera.position.x-position.x,camera.position.z-position.z);
      spiral.visible=!reducedMotion;
      edgeBeams.visible=!reducedMotion;
      for(const {mesh} of particles)mesh.visible=!reducedMotion;
    },
    destroy(){
      group.removeFromParent();
      for(const mesh of group.children as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>[]){
        mesh.geometry.dispose();mesh.material.dispose();
      }
    }
  };
}
