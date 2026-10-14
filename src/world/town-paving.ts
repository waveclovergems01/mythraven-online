import { TOWN_CENTER } from './town-layout';
/** Road layout is independent of material pixels and movement collision. Coordinates are normalized. */
export function createTownPaving(width:number,height:number,_coverage:HTMLImageElement) {
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(width);canvas.height=Math.ceil(height);
  const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
  ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineJoin='round';ctx.lineCap='butt';
  const line=(points:number[][],thickness:number,closed=false)=>{
    const count=points.length;
    const at=(i:number)=>points[closed?(i+count)%count:Math.max(0,Math.min(count-1,i))];
    ctx.beginPath();ctx.moveTo(points[0][0]*width,points[0][1]*height);
    for(let i=0;i<(closed?count:count-1);i++){
      const a=at(i-1),b=at(i),c=at(i+1),d=at(i+2);
      ctx.bezierCurveTo((b[0]+(c[0]-a[0])/6)*width,(b[1]+(c[1]-a[1])/6)*height,
        (c[0]-(d[0]-b[0])/6)*width,(c[1]-(d[1]-b[1])/6)*height,c[0]*width,c[1]*height);
    }
    if(closed)ctx.closePath();ctx.lineWidth=thickness;ctx.stroke();
  };
  const main=Math.min(96,width*.04),side=Math.min(64,width*.026);
  line([[.5,0],[.5,1]],main);
  line([[0,.488],[.20,.488],[.34,.486],[.50,.488],[.67,.489],[.80,.488],[1,.488]],main);
  // Intentional broad S-bends, not random jitter. Main crossroads remain connected.
  line([[.24,.25],[.40,.247],[.60,.255],[.77,.25],[.802,.282],[.788,.35],
    [.807,.413],[.80,.488],[.789,.57],[.805,.65],[.77,.725],
    [.60,.731],[.40,.720],[.23,.725],[.20,.68],[.207,.61],[.192,.55],
    [.20,.488],[.196,.425],[.216,.36],[.202,.30]],side,true);
  const upper=[[.285,.488],[.285,.443],[.313,.411],[.323,.374],[.358,.355],[.415,.352],[.456,.337],[.5,.343]];
  const lower=[[.285,.488],[.287,.532],[.313,.558],[.324,.595],[.371,.615],[.43,.631],[.5,.624]];
  for(const branch of [upper,lower]){
    line(branch,side);line(branch.map(([x,y])=>[1-x,y]),side);
  }
  // Broad chamfered granite courts use a separate material from the street pavers.
  const courts=new Path2D();
  const octagon=(cx:number,cy:number,w:number,h:number)=>{
    const cut=Math.min(w,h)*.16;
    courts.moveTo(cx-w/2+cut,cy-h/2);courts.lineTo(cx+w/2-cut,cy-h/2);
    courts.lineTo(cx+w/2,cy-h/2+cut);courts.lineTo(cx+w/2,cy+h/2-cut);
    courts.lineTo(cx+w/2-cut,cy+h/2);courts.lineTo(cx-w/2+cut,cy+h/2);
    courts.lineTo(cx-w/2,cy+h/2-cut);courts.lineTo(cx-w/2,cy-h/2+cut);courts.closePath();
  };
  octagon(width*.5,height*.145,width*.17,height*.10);
  octagon(width*TOWN_CENTER.x,height*TOWN_CENTER.y,width*.215,height*.16);
  ctx.fill(courts);
  return {canvas,courts};
}
