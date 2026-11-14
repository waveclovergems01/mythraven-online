import {GATES} from './fortifications.mjs';

// Measured landing anchors and deck profiles in the actual painted PNGs.
// The physical navigation plane stays authoritative; only its presentation bends.
const ewCenter=[[0,475],[.15,475],[.34,410],[.5,355],[.66,410],[.85,475],[1,475]];
const ewWidth=[[0,290],[.15,290],[.34,330],[.5,350],[.66,330],[.85,290],[1,290]];
const nsWidth=[[145,264],[256,200],[430,132],[550,148],[670,204],[770,236],[920,336],[1020,336],[1166,244],[1450,264]];
const interpolate=(points,t)=>{
 if(t<=points[0][0])return points[0][1];
 for(let i=1;i<points.length;i++)if(t<=points[i][0]){
  const [a,b]=[points[i-1],points[i]],u=(t-a[0])/(b[0]-a[0]),smooth=u*u*(3-2*u);
  return a[1]+(b[1]-a[1])*smooth;
 }
 return points.at(-1)[1];
};
export function createBridgeSurface(width,height){
 const bridges=GATES.map(g=>{
  const [l,t,r,b]=g.bridge,left=l*width/1448,right=r*width/1448,top=t*height/1086,bottom=b*height/1086;
  const horizontal=g.axis==='x',scaleX=horizontal?(right-left)/(1740-55):(right-left)/264;
  const scaleY=horizontal?(bottom-top)/290:(bottom-top)/(1450-145);
  return {id:g.id,axis:g.axis,left,right,top,bottom,scaleX,scaleY,
   x:horizontal?left-55*scaleX:(left+right)/2-512*scaleX,
   y:horizontal?(top+bottom)/2-475*scaleY:top-145*scaleY,
   sourceWidth:horizontal?1796:1024,sourceHeight:horizontal?876:1536,
   texture:horizontal?'bridge-ew':'bridge-ns'};
 });
 const contains=(b,x,y)=>x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom;
 const nsY=t=>145+1305*t-130*Math.sin(Math.PI*t)**2;
 const project=(x,y)=>{
  const b=bridges.find(b=>contains(b,x,y));if(!b)return {x,y};
  if(b.axis==='x'){
   const t=(x-b.left)/(b.right-b.left),center=(b.top+b.bottom)/2;
   return {x,y:center+(interpolate(ewCenter,t)-475)*b.scaleY+(y-center)*interpolate(ewWidth,t)/290};
  }
  const t=(y-b.top)/(b.bottom-b.top),sourceY=nsY(t),center=(b.left+b.right)/2;
  return {x:center+(x-center)*interpolate(nsWidth,sourceY)/264,y:b.y+sourceY*b.scaleY};
 };
 const unproject=(x,y)=>{
  for(const b of bridges){
   if(b.axis==='x'&&x>=b.left&&x<=b.right){
    const t=(x-b.left)/(b.right-b.left),center=(b.top+b.bottom)/2;
    const logicalY=center+(y-center-(interpolate(ewCenter,t)-475)*b.scaleY)/(interpolate(ewWidth,t)/290);
    if(contains(b,x,logicalY))return {x,y:logicalY};
   }else if(b.axis==='y'&&y>=b.top&&y<=b.bottom){
    // Monotone longitudinal projection; solve it rather than treating raised
    // visible paving as water or sending a click to a different logical cell.
    let low=0,high=1;for(let i=0;i<36;i++){const mid=(low+high)/2;if(b.y+nsY(mid)*b.scaleY<y)low=mid;else high=mid;}
    const t=(low+high)/2,center=(b.left+b.right)/2,logicalX=center+(x-center)/(interpolate(nsWidth,nsY(t))/264);
    if(contains(b,logicalX,b.top+t*(b.bottom-b.top)))return {x:logicalX,y:b.top+t*(b.bottom-b.top)};
   }
  }
  // A lower arch facade is not another walkable deck underneath its image.
  return bridges.some(b=>contains(b,x,y))?{x:NaN,y:NaN}:{x,y};
 };
 return {bridges,project,unproject};
}
