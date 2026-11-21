import * as THREE from 'three';

// Measured in the normalized plaza-angel-fountain GLB's local space.
const LEVEL=1.65, SEGMENTS=128, RADIAL_STEPS=24;
const SPOUT=new THREE.Vector3(1.27,6.59,1.49);
const IMPACT=new THREE.Vector3(2.35,LEVEL,2.9);

export function createFountainWater(source:THREE.BufferGeometry){
  const group=new THREE.Group();group.name='angel-fountain-water';
  const time={value:0},positions:number[]=[],indices:number[]=[];
  // Sample the actual pedestal and inner wall, rather than covering the stone
  // with a circular disc. The tiny overlap terminates inside the solid stone.
  const probeMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const probe=new THREE.Mesh(source,probeMaterial),ray=new THREE.Raycaster();
  probe.updateMatrixWorld();
  for(let i=0;i<=SEGMENTS;i++){
    const a=i/SEGMENTS*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a);
    ray.set(new THREE.Vector3(0,LEVEL,0),new THREE.Vector3(dx,0,dz));
    const distances=ray.intersectObject(probe).map(h=>h.distance).filter((d,j,all)=>j===0||d-all[j-1]>.03);
    if(distances.length<2){probeMaterial.dispose();throw new Error('Fountain basin contour is missing');}
    const inner=distances[0]-.035,outer=distances[1]+.035;
    for(let j=0;j<=RADIAL_STEPS;j++){
      const r=THREE.MathUtils.lerp(inner,outer,j/RADIAL_STEPS);
      positions.push(dx*r,LEVEL,dz*r);
      if(i<SEGMENTS && j<RADIAL_STEPS){
        const n=i*(RADIAL_STEPS+1)+j, next=n+RADIAL_STEPS+1;
        indices.push(n,next,n+1,n+1,next,next+1);
      }
    }
  }
  probeMaterial.dispose();
  const surfaceGeometry=new THREE.BufferGeometry();
  surfaceGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));surfaceGeometry.setIndex(indices);surfaceGeometry.computeVertexNormals();
  const surfaceMaterial=new THREE.MeshStandardMaterial({
    color:0x2369bb, roughness:.46, metalness:0, transparent:true, opacity:.61, depthWrite:false
  });
  surfaceMaterial.customProgramCacheKey=()=> 'angel-basin-waves-v2';
  surfaceMaterial.onBeforeCompile=shader=>{
    shader.uniforms.fountainTime=time;
    shader.uniforms.impactXZ={value:new THREE.Vector2(IMPACT.x,IMPACT.z)};
    shader.vertexShader=`uniform float fountainTime;
      uniform vec2 impactXZ;
      varying float waveCrest;
      float waveHeight(vec2 p){
        float d=length(p-impactXZ);
        float swell=sin(dot(p,vec2(2.6,1.2))-fountainTime*1.9+.6*sin(p.y*1.3));
        float crossWave=sin(dot(p,vec2(-1.2,3.8))-fountainTime*2.1);
        float impact=sin(d*10.-fountainTime*4.5)*exp(-d*1.2);
        return .033*swell+.017*crossWave+.037*impact;
      }
      `+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`
      #include <beginnormal_vertex>
      vec2 p=position.xz;
      float h=waveHeight(p);
      objectNormal=normalize(vec3(h-waveHeight(p+vec2(.015,0.)),.015,h-waveHeight(p+vec2(0.,.015))));
    `).replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.y+=h;
      waveCrest=h;
    `);
    shader.fragmentShader='varying float waveCrest;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      diffuseColor.rgb*=1.+2.8*waveCrest;
    `);
  };
  const surface=new THREE.Mesh(surfaceGeometry,surfaceMaterial);surface.name='basin-water';surface.receiveShadow=true;surface.renderOrder=1;group.add(surface);
  const curve=new THREE.QuadraticBezierCurve3(SPOUT,new THREE.Vector3(2.12,6.69,2.59),IMPACT);
  const streamGeometry=new THREE.TubeGeometry(curve,48,.085,8,false);
  const streamMaterial=new THREE.MeshStandardMaterial({color:0x8ebfe0,roughness:.22,metalness:.05,transparent:true,opacity:.78,depthWrite:false});
  streamMaterial.customProgramCacheKey=()=> 'angel-urn-stream-v1';
  streamMaterial.onBeforeCompile=shader=>{
    shader.uniforms.fountainTime=time;
    shader.vertexShader='varying vec2 fountainUV;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfountainUV=uv;');
    shader.fragmentShader='varying vec2 fountainUV;uniform float fountainTime;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float flow=.5+.5*sin(fountainUV.x*90.-fountainTime*16.+sin(fountainUV.y*19.));
      diffuseColor.rgb*=.75+.35*flow;diffuseColor.a*=.75+.25*flow;
    `);
  };
  const stream=new THREE.Mesh(streamGeometry,streamMaterial);stream.name='urn-water-stream';stream.renderOrder=2;group.add(stream);
  return {group,update(seconds:number){time.value=seconds;},dispose(){
    group.removeFromParent();
    surfaceGeometry.dispose();surfaceMaterial.dispose();
    streamGeometry.dispose();streamMaterial.dispose();
  }};
}
