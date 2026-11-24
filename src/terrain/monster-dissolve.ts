import * as THREE from 'three';

// The skin, its shadow, and the sparks use the same spatial field. Each spark
// leaves a sampled point on the final posed skin when that patch breaks away.
const field = `
  float breakup(vec3 world) {
    vec3 p=world*8.;
    return .5+.24*sin(p.y+sin(p.x))+.17*sin(p.z*1.7+p.x)+.09*sin(dot(p,vec3(3.1,2.7,1.9)));
  }
`;

export function createMonsterDissolve(model:THREE.Object3D) {
  const progress={value:0};
  const meshes:THREE.Mesh[]=[];
  model.traverse(o=>{if(o instanceof THREE.Mesh && o.name!=='player-outline')meshes.push(o);});
  const originals=meshes.map(mesh=>mesh.material);
  const depths=meshes.map(mesh=>mesh.customDepthMaterial);
  function patch(material:THREE.Material,lit:boolean){
    material.onBeforeCompile=shader=>{
      shader.uniforms.deathProgress=progress;
      shader.vertexShader='varying vec3 deathWorld;\n'+shader.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\ndeathWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader='uniform float deathProgress; varying vec3 deathWorld;\n'+field+shader.fragmentShader.replace(
        '#include <alphatest_fragment>',`#include <alphatest_fragment>
        float edge=breakup(deathWorld)-deathProgress;
        if(edge<0.)discard;`).replace('#include <opaque_fragment>',
        (lit?'outgoingLight=mix(vec3(2.8,1.65,.55),outgoingLight,smoothstep(0.,.065,edge));\n':'')+'#include <opaque_fragment>');
    };
    material.customProgramCacheKey=()=>lit?'monster-dissolve-color':'monster-dissolve-depth';
    return material;
  }
  const materials=new Map<THREE.Material,THREE.Material>();
  function dissolveMaterial(source:THREE.Material){
    let mat=materials.get(source);
    if(!mat){mat=patch(source.clone(),true);materials.set(source,mat);}
    return mat;
  }
  const replacements=originals.map(mat=>Array.isArray(mat)?mat.map(dissolveMaterial):dissolveMaterial(mat));
  const depth=patch(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),false);
  const count=72,geometry=new THREE.BufferGeometry();
  const positions=new THREE.Float32BufferAttribute(new Float32Array(count*3),3);
  geometry.setAttribute('position',positions);
  geometry.setAttribute('seed',new THREE.Float32BufferAttribute(Array.from({length:count},()=>Math.random()),1));
  const sparkle=new THREE.ShaderMaterial({
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
    uniforms:{deathProgress:progress},
    vertexShader:field+`uniform float deathProgress; attribute float seed; varying float brightness;
      void main(){
        vec3 world=(modelMatrix*vec4(position,1.)).xyz;
        float t=clamp((deathProgress-breakup(world))/.42,0.,1.);
        brightness=sin(3.14159*t)*(.72+.28*cos(23.*t+seed*30.));
        world+=vec3(sin(seed*81.)*.34,.45+seed*.75,cos(seed*53.)*.28)*t;
        gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
        gl_PointSize=(3.+seed*4.)*(.6+brightness);
      }`,
    fragmentShader:`varying float brightness;
      void main(){
        vec2 d=abs(gl_PointCoord-.5)*2.;
        float star=max(0.,1.-length(d))*exp(-8.*min(d.x,d.y));
        gl_FragColor=vec4(1.,.86,.52,star*brightness);
      }`
  });
  const sparks=new THREE.Points(geometry,sparkle);sparks.frustumCulled=false;
  function start(parent:THREE.Object3D){
    parent.updateWorldMatrix(true,true);
    const inverse=parent.matrixWorld.clone().invert(),point=new THREE.Vector3();
    const totals:number[]=[];let vertices=0;
    for(const mesh of meshes){
      if(mesh instanceof THREE.SkinnedMesh)mesh.skeleton.update();
      vertices+=mesh.geometry.attributes.position.count;totals.push(vertices);
    }
    for(let i=0;i<count;i++){
      const vertex=Math.floor(Math.random()*vertices),index=totals.findIndex(n=>vertex<n),mesh=meshes[index];
      mesh.getVertexPosition(vertex-(totals[index-1]??0),point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
      positions.setXYZ(i,point.x,point.y,point.z);
    }
    positions.needsUpdate=true;progress.value=0;parent.add(sparks);
    meshes.forEach((mesh,i)=>{mesh.material=replacements[i];mesh.customDepthMaterial=depth;});
  }
  function reset(){
    sparks.removeFromParent();
    meshes.forEach((mesh,i)=>{mesh.material=originals[i];mesh.customDepthMaterial=depths[i];});
  }
  return {start,update:(fraction:number)=>{progress.value=fraction*1.42;},reset,
    dispose(){reset();for(const mat of materials.values())mat.dispose();depth.dispose();geometry.dispose();sparkle.dispose();}};
}
