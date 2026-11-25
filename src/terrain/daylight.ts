import {worldHour,WORLD_TIME} from '../../shared/world-time.mjs';
import {FOG_START,VIEW_DISTANCE,SHADOW_CAMERA_EXTENT} from './view-distance';
import * as THREE from 'three';

/** One shared sky/light direction in world space; changing the view cannot turn the sun. */
export function createDaylight(scene: THREE.Scene) {
  const ambient = new THREE.HemisphereLight('#f2f5e6', '#718478', 2.15);
  const sun = new THREE.DirectionalLight('#fff0d0', 2.5);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { near: 1, far: 1100 });
  sun.shadow.normalBias = .025; sun.shadow.bias = -.00004; sun.shadow.radius = 2;
  const direction = new THREE.Vector3(), moonDirection = new THREE.Vector3();
  const uniforms = {
    sunDirection: { value: direction }, moonDirection: { value: moonDirection }, daylight: { value: 1 },
    horizonColor: { value: new THREE.Color() }, zenithColor: { value: new THREE.Color() },
  };
  // A camera-centered 3D sky: discs remain at celestial bearings, with no raster assets.
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
    vertexShader: `varying vec3 skyDirection;
      void main(){ skyDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 skyDirection;
      uniform vec3 sunDirection,moonDirection,horizonColor,zenithColor; uniform float daylight;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){
        vec3 d=normalize(skyDirection);
        vec3 color=mix(horizonColor,zenithColor,pow(max(d.y,0.0),.55));
        float s=dot(d,sunDirection),m=dot(d,moonDirection);
        float sunDisc=smoothstep(cos(.016),cos(.012),s)*smoothstep(-.04,.02,sunDirection.y);
        color+=vec3(1.0,.54,.19)*pow(max(s,0.0),100.0)*.3*daylight;
        color=mix(color,vec3(1.0,.94,.69)*2.2,sunDisc);
        float moonDisc=smoothstep(cos(.013),cos(.011),m)*smoothstep(-.04,.03,moonDirection.y)*(1.0-daylight);
        float crater=(.7+.24*noise(d*230.0)+.06*noise(d*950.0))*(.75+.25*sqrt(clamp((m-cos(.013))/(1.0-cos(.013)),0.0,1.0)));
        color+=vec3(.24,.34,.6)*pow(max(m,0.0),280.0)*.22*(1.0-daylight);
        color=mix(color,vec3(.72,.81,1.0)*crater,moonDisc);
        vec3 starCell=d*420.0; float star=step(.9985,hash(floor(starCell)))*pow(max(0.0,1.0-length(fract(starCell)-.5)*2.0),4.0);
        color+=star*(1.0-daylight)*smoothstep(0.0,.2,d.y)*2.0;
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), material);
  sky.name = 'celestial-sky'; sky.renderOrder = -100; sky.frustumCulled = false;
  const fog = new THREE.Fog('#c3d2cd', FOG_START, VIEW_DISTANCE); scene.fog = fog;
  scene.add(ambient, sun, sun.target, sky);
  let hour = worldHour(Date.now()), bearing = WORLD_TIME.bearing, day = 1;
  const daySky = new THREE.Color('#75abc9'), nightSky = new THREE.Color('#0a142d');
  const dayHorizon = new THREE.Color('#c6d9d5'), duskHorizon = new THREE.Color('#e8a67d'), nightHorizon = new THREE.Color('#273854');
  const dayAmbient=new THREE.Color('#f2f5e6'),dayGround=new THREE.Color('#718478');
  const warm = new THREE.Color('#ffd1a0'), white = new THREE.Color('#fff0d0'), moonColor = new THREE.Color('#9fbbef');
  const configure = (nextHour: number, nextBearing: number) => {
    hour = THREE.MathUtils.clamp(nextHour, 0, 24); bearing = nextBearing;
    const phase = (hour - 6) / 12 * Math.PI;
    const elevation = Math.sin(phase) * THREE.MathUtils.degToRad(50);
    const azimuth = THREE.MathUtils.degToRad(bearing + (hour - 9) * 15);
    direction.set(Math.sin(azimuth), Math.tan(elevation), -Math.cos(azimuth)).normalize();
    moonDirection.copy(direction).negate();
    day = THREE.MathUtils.smoothstep(direction.y, -.12, .22);
    uniforms.daylight.value = day;
    const warmth = 1 - THREE.MathUtils.smoothstep(direction.y, .1, .55);
    uniforms.zenithColor.value.copy(nightSky).lerp(daySky, day);
    uniforms.horizonColor.value.copy(dayHorizon).lerp(duskHorizon, warmth * .75).lerp(nightHorizon, 1 - day);
    fog.color.copy(uniforms.horizonColor.value);
    ambient.color.set('#a2b9e7').lerp(dayAmbient, day);
    ambient.groundColor.set('#273549').lerp(dayGround, day);
    ambient.intensity = THREE.MathUtils.lerp(.45, 2.15, day);
    sun.color.copy(warm).lerp(white, 1 - warmth).lerp(moonColor, 1 - day);
    sun.intensity = THREE.MathUtils.lerp(.65, 2.5, day);
    // Fade shadows at the horizon before switching the casting light to the moon.
    sun.shadow.intensity=THREE.MathUtils.smoothstep(Math.abs(direction.y),.015,.12);
  };
  configure(hour, bearing);
  const lightDirection = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), center = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  return {
    sun, configure,
    update(camera: THREE.PerspectiveCamera, focus: THREE.Vector3,serverMs?:number) {
      if(serverMs!==undefined)configure(worldHour(serverMs),WORLD_TIME.bearing);
      sky.position.copy(camera.position);
      lightDirection.copy(direction.y >= 0 ? direction : moonDirection);
      // Keep grazing-angle shadows usable at sunrise/sunset; the sky still shows
      // the true altitude. At night this same shadow map is lit by the moon.
      lightDirection.y = Math.max(.18, lightDirection.y); lightDirection.normalize();
      // A fixed light-space volume covers the 150 m clear zone and the entire fog fade.
      // Extra margin covers tall trees/buildings and texel snapping at every solar angle.
      const radius = SHADOW_CAMERA_EXTENT;
      const shadowCamera = sun.shadow.camera;
      if (Math.abs(shadowCamera.right - radius) > .01) {
        Object.assign(shadowCamera, { left: -radius, right: radius, top: radius, bottom: -radius });
        shadowCamera.updateProjectionMatrix();
      }
      // Snap in the light's own axes, so every time/direction/orbit shares stable shadows.
      right.crossVectors(worldUp, lightDirection).normalize(); up.crossVectors(lightDirection, right);
      const texel = radius * 2 / sun.shadow.mapSize.x;
      center.copy(focus);
      center.addScaledVector(right, Math.round(focus.dot(right) / texel) * texel - focus.dot(right));
      center.addScaledVector(up, Math.round(focus.dot(up) / texel) * texel - focus.dot(up));
      sun.target.position.copy(center); sun.position.copy(center).addScaledVector(lightDirection, 450);
    },
    // Imported painted characters use emission: dim it as well as ordinary lights.
    get paintedBrightness() { return THREE.MathUtils.lerp(.28, 1, day); },
    get lanternStrength() { return 1 - THREE.MathUtils.smoothstep(direction.y, -.21, -.015); },
    inspect: () => ({ hour, bearing, daylight: day, shadowExtent:SHADOW_CAMERA_EXTENT, sunDirection: direction.toArray(), moonDirection: moonDirection.toArray() }),
    dispose() { scene.remove(ambient, sun, sun.target, sky); sky.geometry.dispose(); material.dispose(); sun.shadow.dispose(); scene.fog = null; },
  };
}
