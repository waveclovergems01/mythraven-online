// Maintained model source: regenerate the review GLB with node scripts/build-riverside-oak.mjs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result=result; this.onloadend?.(); }); }
};
let seed=81927;
const random=()=>{ seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296; };
const root=new THREE.Group(); root.name='RiversideOak_v001';
const wood=[], foliage=[];
const barkDark=new THREE.Color('#604332'), barkLight=new THREE.Color('#b38b57');
const v=p=>new THREE.Vector3(...p);
function limb(points, r0, r1, segments=16) {
  const curve=new THREE.CatmullRomCurve3(points.map(v)), vertices=[], colors=[], uv=[], indices=[];
  const sides=r0>.4?18:12;
  for(let row=0;row<=segments;row++) {
    const t=row/segments, p=curve.getPoint(t), tangent=curve.getTangent(t);
    const axis=new THREE.Vector3(0,0,1); if(Math.abs(tangent.dot(axis))>.9) axis.set(1,0,0);
    const a=new THREE.Vector3().crossVectors(tangent,axis).normalize(), b=new THREE.Vector3().crossVectors(tangent,a).normalize();
    const radius=THREE.MathUtils.lerp(r0,r1,t)*(.92+.08*Math.cos(t*5));
    for(let col=0;col<=sides;col++) {
      const angle=col/sides*Math.PI*2, groove=1+.07*Math.sin(angle*7+t*3)+.035*Math.sin(angle*13-t*4);
      const n=a.clone().multiplyScalar(Math.cos(angle)).addScaledVector(b,Math.sin(angle));
      const point=p.clone().addScaledVector(n,radius*groove);
      vertices.push(...point.toArray());uv.push(col/sides,t);
      const ridge=.5+.24*Math.sin(angle*7+t*3)+.12*Math.cos(angle*13-t*4);
      const c=barkDark.clone().lerp(barkLight,THREE.MathUtils.clamp(ridge,0,1));
      c.multiplyScalar(.82+.18*t); colors.push(...c.toArray());
      if(row<segments&&col<sides) {const i=row*(sides+1)+col;indices.push(i,i+1,i+sides+1,i+1,i+sides+2,i+sides+1);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();wood.push(g);
}
limb([[0,-.12,0],[.18,1.2,.06],[-.12,2.5,.12],[.3,3.8,-.1],[-.2,5.2,.05],[-.45,6.8,-.1]],.76,.09,28);
for(let i=0;i<8;i++) {
  const a=i*2.39996, length=1.3+random()*.8;
  limb([[Math.cos(a)*.18,.8,Math.sin(a)*.18],[Math.cos(a)*.65,.18,Math.sin(a)*.65],
    [Math.cos(a)*length,-.06,Math.sin(a)*length]],.27,.025,10);
}
const lobes=[];
for(let i=0;i<11;i++) {
  const a=i*2.39996+.35, ring=i<7?3.1+random()*.65:1.4+random()*.8;
  const height=i<7?4.7+random()*1.3:6.6+random()*1.1;
  const end=[Math.cos(a)*ring,height,Math.sin(a)*ring];
  const attach=2.1+(i%4)*.55;
  limb([[0,attach,0],[Math.cos(a)*.8,attach+.8,Math.sin(a)*.8],
    [end[0]*.72,height-.65,end[2]*.72],end],.29-(i%3)*.035,.025,18);
  lobes.push({center:v(end),radius:1.05+random()*.35});
  for(let fork=0;fork<2;fork++) {
    const fa=a+(fork?1:-1)*.55;
    const tip=[end[0]*.68+Math.cos(fa)*1.05,height+.15+random()*.7,end[2]*.68+Math.sin(fa)*1.05];
    limb([[end[0]*.6,height-.9,end[2]*.6],[tip[0]*.9,tip[1]-.4,tip[2]*.9],tip],.105,.013,10);
    lobes.push({center:v(tip),radius:.75+random()*.4});
  }
}
lobes.push({center:v([-.4,7.7,0]),radius:1.15});
// Inner boughs bridge the outer branch fans without making a hollow ring canopy.
for(const center of [[0,5.5,0],[-.8,6.4,.5],[.8,6.8,-.4],[0,7.2,1.1],[-1.1,5.6,-1],[1.2,5.3,.5]])
  lobes.push({center:v(center),radius:1.25});
const leafLow=new THREE.Color('#a6ad84'), leafHigh=new THREE.Color('#fff5cf');
for(const lobe of lobes) for(let i=0;i<12;i++) {
  const a=random()*Math.PI*2, elevation=random()*2-1, radius=lobe.radius*Math.cbrt(random());
  const horizontal=Math.sqrt(1-elevation*elevation);
  const p=lobe.center.clone().add(v([Math.cos(a)*horizontal*radius,elevation*radius*.75,Math.sin(a)*horizontal*radius]));
  const size=1.65+random()*1.0;
  const g=new THREE.PlaneGeometry(size,size*.88,2,2), positions=g.getAttribute('position');
  for(let j=0;j<positions.count;j++) {
    const x=positions.getX(j), y=positions.getY(j);
    positions.setZ(j,(x*x+y*y)*.22/size);
  }
  g.computeVertexNormals();
  // Fixed spatial orientations: these are 3D foliage sprays, never camera-facing billboards.
  g.rotateX(-.35-random()*1.5);g.rotateY(random()*Math.PI*2);g.rotateZ((random()-.5)*1.1);g.translate(p.x,p.y,p.z);
  const shade=THREE.MathUtils.clamp(.25+(p.y-4)/6+(random()-.5)*.22,0,1);
  const color=leafLow.clone().lerp(leafHigh,shade), values=[];
  for(let j=0;j<positions.count;j++) values.push(...color.toArray());
  g.setAttribute('color',new THREE.Float32BufferAttribute(values,3));foliage.push(g);
}
const bark=new THREE.Mesh(mergeGeometries(wood),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94}));
bark.name='Oak_Trunk_Branches_Roots';
const crown=new THREE.Mesh(mergeGeometries(foliage),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,side:THREE.DoubleSide,alphaTest:.38}));
crown.name='Oak_Painted_Foliage';
root.add(bark,crown); root.userData={candidate:true,units:'metres',rootRadius:.9};
const raw=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true}));
// Embed the validated foliage PNG so the runtime GLB is portable and self-contained.
const jsonLength=raw.readUInt32LE(12), document=JSON.parse(raw.subarray(20,20+jsonLength).toString());
const binStart=20+jsonLength+8, bin=raw.subarray(binStart);
const png=await readFile(new URL('../art/source/trees/riverside-oak-leaves-v001.png',import.meta.url));
const pixels=Buffer.alloc(Math.ceil(png.length/4)*4);png.copy(pixels);
const view=document.bufferViews.length;document.bufferViews.push({buffer:0,byteOffset:bin.length,byteLength:png.length});
document.images=[{bufferView:view,mimeType:'image/png',name:'PaintedOakLeaves'}];
document.samplers=[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}];document.textures=[{sampler:0,source:0}];
const leafMesh=document.nodes.find(node=>node.name===crown.name).mesh;
const leafMaterial=document.meshes[leafMesh].primitives[0].material;
document.materials[leafMaterial].pbrMetallicRoughness.baseColorTexture={index:0};
document.buffers[0].byteLength=bin.length+pixels.length;
const jsonBytes=Buffer.from(JSON.stringify(document)), json=Buffer.alloc(Math.ceil(jsonBytes.length/4)*4,32);jsonBytes.copy(json);
const result=Buffer.alloc(12+8+json.length+8+bin.length+pixels.length);
result.writeUInt32LE(0x46546c67,0);result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8);
result.writeUInt32LE(json.length,12);result.writeUInt32LE(0x4e4f534a,16);json.copy(result,20);
const offset=20+json.length;result.writeUInt32LE(bin.length+pixels.length,offset);result.writeUInt32LE(0x004e4942,offset+4);
bin.copy(result,offset+8);pixels.copy(result,offset+8+bin.length);
const directory=new URL('../public/assets/models/trees/',import.meta.url);await mkdir(directory,{recursive:true});
await writeFile(new URL('riverside-oak-v001.glb',directory),result);
console.log(JSON.stringify({bytes:result.byteLength,triangles:(bark.geometry.index.count+crown.geometry.index.count)/3,foliageCards:foliage.length}));
