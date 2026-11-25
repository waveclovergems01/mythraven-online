import * as THREE from 'three';
export const VIEW_DISTANCE=250;
export const FOG_START=150;
export const SHADOW_FULL_DISTANCE=FOG_START;
export const SHADOW_FADE_END=VIEW_DISTANCE;
export const SHADOW_CAMERA_EXTENT=280;
/** Player-centred fog agrees with the distance culler regardless of camera orbit/zoom. */
export function createViewDistance(scene:THREE.Scene){
  const focus={value:new THREE.Vector2()},seen=new WeakSet<THREE.Material>();
  const entries:{object:THREE.Object3D;box:THREE.Box3}[]=[];
  const box=new THREE.Box3();
  let lastX=Infinity,lastZ=Infinity;
  function materials(root:THREE.Object3D){root.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(seen.has(material) || !('fog' in material) || !material.fog)continue;
      seen.add(material);
      const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
      material.customProgramCacheKey=()=>key+'-player-distance-shadow-v2';
      material.onBeforeCompile=(shader:Parameters<THREE.Material['onBeforeCompile']>[0],renderer:THREE.WebGLRenderer)=>{
        compile.call(material,shader,renderer);shader.uniforms.distanceFocus=focus;
        shader.vertexShader='varying vec2 distanceWorld;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
          vec4 distancePosition=vec4(transformed,1.0);
          #ifdef USE_INSTANCING
          distancePosition=instanceMatrix*distancePosition;
          #endif
          distanceWorld=(modelMatrix*distancePosition).xz;`);
        shader.fragmentShader='varying vec2 distanceWorld;uniform vec2 distanceFocus;\n'+shader.fragmentShader;
        const shadowStrength='directionalLightShadow.shadowIntensity * (1.0-smoothstep('+SHADOW_FULL_DISTANCE.toFixed(1)+','+SHADOW_FADE_END.toFixed(1)+',length(distanceWorld-distanceFocus)))';
        shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',
          THREE.ShaderChunk.lights_fragment_begin.replace('directionalLightShadow.shadowIntensity,',shadowStrength+','));
        shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`
          #ifdef USE_FOG
          float distanceFog=smoothstep(${FOG_START.toFixed(1)},${VIEW_DISTANCE.toFixed(1)},length(distanceWorld-distanceFocus));
          gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,distanceFog);
          #endif`);
      };
      material.needsUpdate=true;
    }
  });}
  function addStatic(root:THREE.Object3D){
    // Spatially split broad species/building batches. Bridge pick surfaces retain their identity.
    const instances:THREE.InstancedMesh[]=[];
    root.traverse(o=>{if(o instanceof THREE.InstancedMesh && o.name!=='city-stone-bridge')instances.push(o);});
    for(const source of instances){
      if(source.boundingBox && source.boundingBox.max.x-source.boundingBox.min.x<=96 && source.boundingBox.max.z-source.boundingBox.min.z<=96)continue;
      const patches=new Map<string,THREE.Matrix4[]>(),matrix=new THREE.Matrix4(),position=new THREE.Vector3();
      for(let i=0;i<source.count;i++){
        source.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
        const key=Math.floor(position.x/64)+','+Math.floor(position.z/64);
        if(!patches.has(key))patches.set(key,[]);patches.get(key)!.push(matrix.clone());
      }
      if(patches.size<=1)continue;
      for(const matrices of patches.values()){
        const mesh=new THREE.InstancedMesh(source.geometry,source.material,matrices.length);
        mesh.name=source.name;mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);
        mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;mesh.customDepthMaterial=source.customDepthMaterial;
        matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingBox();mesh.computeBoundingSphere();
        mesh.boundingBox?.expandByScalar(.6);if(mesh.boundingSphere)mesh.boundingSphere.radius+=.6;
        source.parent!.add(mesh);
      }
      source.removeFromParent();source.dispose();
    }
    materials(root);root.updateWorldMatrix(true,true);
    root.traverse(object=>{if(!(object instanceof THREE.Mesh) || !object.visible)return;
      box.setFromObject(object);entries.push({object,box:box.clone()});
    });
  }
  return {materials,addStatic,
    update(player:THREE.Vector3){
      focus.value.set(player.x,player.z);
      if(scene.fog instanceof THREE.Fog){scene.fog.near=FOG_START;scene.fog.far=VIEW_DISTANCE;}
      if((player.x-lastX)**2+(player.z-lastZ)**2<.25)return;
      lastX=player.x;lastZ=player.z;
      for(const {object,box} of entries){
        const dx=Math.max(box.min.x-player.x,0,player.x-box.max.x),dz=Math.max(box.min.z-player.z,0,player.z-box.max.z);
        object.visible=dx*dx+dz*dz<VIEW_DISTANCE*VIEW_DISTANCE;
      }
    },
    inspect:()=>({radius:VIEW_DISTANCE,fogStart:FOG_START,batches:entries.length,visible:entries.filter(e=>e.object.visible).length})
  };
}
