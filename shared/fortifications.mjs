// Layout coordinates use the maintained 1448 x 1086 capital ground plan.
// The owner's red outline is approximate; walls follow stepped, buildable banks.
export const PERIMETER = [
 [285,160],[550,160],[550,105],[960,105],[960,155],[1230,155],
 [1230,350],[1300,350],[1300,640],[1240,640],[1240,890],
 [1060,890],[1060,865],[900,865],[900,905],[570,905],
 [570,855],[450,855],[450,880],[300,880],[300,855],[230,855],
 [230,660],[180,660],[180,410],[225,410],
 [225,335],[285,335],
];
export const GATES = [
 {id:'west',x:180,y:490,axis:'x',bridge:[35,467,240,513],inside:[250,490],outside:[45,490]},
 {id:'east',x:1300,y:490,axis:'x',bridge:[1250,467,1435,513],inside:[1230,490],outside:[1420,490]},
 {id:'south',x:740,y:905,axis:'y',bridge:[717,870,763,1055],inside:[740,850],outside:[740,1040]},
];
/** One geometry contract for rendering, minimap, navigation and server collision. */
export function getFortifications(width,height){
 const sx=width/1448,sy=height/1086;
 const walls=[],towers=[],bridges=[],rails=[];
 const rectangle=(l,t,r,b)=>({left:l*sx,top:t*sy,right:r*sx,bottom:b*sy});
 const wall=(x1,y1,x2,y2)=>walls.push({x1:x1*sx,y1:y1*sy,x2:x2*sx,y2:y2*sy,
  axis:x1===x2?'y':'x',footprint:rectangle(Math.min(x1,x2)-5,Math.min(y1,y2)-5,Math.max(x1,x2)+5,Math.max(y1,y2)+5)});
 for(let i=0;i<PERIMETER.length;i++){
  const a=PERIMETER[i],b=PERIMETER[(i+1)%PERIMETER.length];
  const gate=GATES.find(g=>a[0]===b[0]?g.axis==='x'&&g.x===a[0]&&g.y>Math.min(a[1],b[1])&&g.y<Math.max(a[1],b[1]):g.axis==='y'&&g.y===a[1]&&g.x>Math.min(a[0],b[0])&&g.x<Math.max(a[0],b[0]));
  if(gate){
   if(gate.axis==='x'){wall(a[0],Math.min(a[1],b[1]),a[0],gate.y-40);wall(a[0],gate.y+40,a[0],Math.max(a[1],b[1]));}
   else{wall(Math.min(a[0],b[0]),a[1],gate.x-40,a[1]);wall(gate.x+40,a[1],Math.max(a[0],b[0]),a[1]);}
  }else wall(...a,...b);
  // Closely spaced corners share a turret, avoiding overlapping towers.
  if(Math.hypot(a[0]-b[0],a[1]-b[1])>=40&&!GATES.some(g=>Math.hypot(a[0]-g.x,a[1]-g.y)<120))towers.push({x:a[0]*sx,y:a[1]*sy,gate:false});
 }
 for(const g of GATES){
  for(const offset of [-40,40])towers.push({x:(g.x+(g.axis==='y'?offset:0))*sx,y:(g.y+(g.axis==='x'?offset:0))*sy,gate:true});
  const [l,t,r,b]=g.bridge;bridges.push({id:g.id,axis:g.axis,...rectangle(l,t,r,b)});
  // Low parapets run along the river span only, leaving both approaches open.
  if(g.axis==='x')for(const y of [t+1,b-1])rails.push({axis:'x',...rectangle(l,y-1.5,r,y+1.5)});
  else for(const x of [l+1,r-1])rails.push({axis:'y',...rectangle(x-1.5,t,x+1.5,b)});
 }
 const solids=[...walls.map(w=>w.footprint),...towers.map(t=>({left:t.x-(t.gate?220:190),top:t.y-90,right:t.x+(t.gate?220:190),bottom:t.y+90})),...rails];
 return {walls,towers,bridges,rails,solids};
}
