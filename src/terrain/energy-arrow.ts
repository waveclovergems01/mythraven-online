import * as THREE from 'three';

/** Crossed luminous planes retain their arrow silhouette from either side of the bow. */
export function createEnergyArrow(){
  const geometry=new THREE.PlaneGeometry(1,.24);
  const material=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,depthTest:false,toneMapped:false,
    uniforms:{opacity:{value:1}},
    vertexShader:`varying vec2 arrowUV;void main(){arrowUV=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 arrowUV;uniform float opacity;
      void main(){
        float x=arrowUV.x,y=abs(arrowUV.y);
        float shaft=(1.-smoothstep(.035,.10,y))*(1.-smoothstep(.72,.85,x));
        float tipWidth=.78*(1.-clamp((x-.5)/.5,0.,1.));
        float tip=(1.-smoothstep(tipWidth-.04,tipWidth+.02,y))*step(.5,x);
        float featherWidth=.55*(1.-abs((x+.77)/.23));
        float feathers=(1.-smoothstep(featherWidth-.035,featherWidth+.02,y))*step(-1.,x)*(1.-step(-.54,x));
        float core=max(shaft,max(tip,feathers));
        float glow=exp(-y*y*9.)*.45*(1.-smoothstep(.8,1.,abs(x)));
        float alpha=max(core,glow)*opacity;
        vec3 color=mix(vec3(1.,.035,.075),vec3(1.,.94,.90),core*.9);
        gl_FragColor=vec4(color,alpha);
      }`});
  const group=new THREE.Group();group.name='energy-arrow';
  for(const angle of [0,Math.PI/2]){const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=angle;mesh.renderOrder=9998;group.add(mesh);}
  const direction=new THREE.Vector3(),axis=new THREE.Vector3(1,0,0);
  return {group,
    place(tail:THREE.Vector3,tip:THREE.Vector3,opacity=1){
      direction.subVectors(tip,tail);const length=direction.length();
      group.position.copy(tail).add(tip).multiplyScalar(.5);
      if(length>.001)group.quaternion.setFromUnitVectors(axis,direction.divideScalar(length));
      group.scale.set(length,1,1);material.uniforms.opacity.value=opacity;
    },
    dispose(){group.removeFromParent();geometry.dispose();material.dispose();}
  };
}
