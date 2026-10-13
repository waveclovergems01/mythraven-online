/** Road layout is independent of material pixels and movement collision. Coordinates are normalized. */
export function createTownPaving(width:number,height:number,coverage:HTMLImageElement) {
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
  line([[.5,0],[.5,.88]],main);
  line([[.09,.488],[.20,.488],[.34,.486],[.50,.488],[.67,.489],[.80,.488],[.914,.488]],main);
  // Intentional broad S-bends, not random jitter. Main crossroads remain connected.
  line([[.24,.25],[.40,.247],[.60,.255],[.77,.25],[.802,.282],[.788,.35],
    [.807,.413],[.80,.488],[.789,.57],[.805,.65],[.77,.725],
    [.60,.731],[.40,.720],[.23,.725],[.20,.68],[.207,.61],[.192,.55],
    [.20,.488],[.196,.425],[.216,.36],[.202,.30],[.24,.25]].slice(0,-1).map(([x,y])=>[x,y]),side,true);
  const upper=[[.285,.488],[.285,.443],[.313,.411],[.323,.374],[.358,.355],[.415,.352],[.456,.337],[.5,.343]];
  const lower=[[.285,.488],[.287,.532],[.313,.558],[.324,.595],[.371,.615],[.43,.631],[.5,.624]];
  for(const branch of [upper,lower]){
    line(branch,side);line(branch.map(([x,y])=>[1-x,y]),side);
  }
  ctx.fillRect(.436*width,.402*height,.128*width,.20*height);
  ctx.fillRect(.42*width,.10*height,.16*width,.083*height);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const grassCanvas=document.createElement('canvas');grassCanvas.width=canvas.width;grassCanvas.height=canvas.height;
  const gc=grassCanvas.getContext('2d',{willReadFrequently:true})!;gc.drawImage(coverage,0,0,canvas.width,canvas.height);
  const grass=gc.getImageData(0,0,canvas.width,canvas.height).data;
  const inside=(x:number,y:number)=>x>=0&&y>=0&&x<canvas.width&&y<canvas.height&&data[(Math.floor(y)*canvas.width+Math.floor(x))*4+3]>128;
  const alpha=(x:number,y:number)=>x>=0&&y>=0&&x<canvas.width&&y<canvas.height?grass[(Math.floor(y)*canvas.width+Math.floor(x))*4+3]:0;
  const fringe=new Path2D();
  // Small irregular groups reveal the underlying grass texture, with taller upward tips at south edges.
  for(let y=8;y<height-12;y+=4)for(let x=8;x<width-12;x+=5){
    if(!inside(x,y))continue;
    const south=!inside(x,y+5)&&alpha(x,y+7)>145;
    const sideEdge=(!inside(x+5,y)&&alpha(x+7,y)>145)||(!inside(x-5,y)&&alpha(x-7,y)>145);
    if(!south&&!sideEdge)continue;
    const seed=Math.sin(x*12.9898+y*78.233)*43758.5453,n=seed-Math.floor(seed);
    if(n<.5 || Math.sin(x*.035+y*.022)+Math.cos(x*.061-y*.017)<.3)continue;
    const h=south?4+n*8:2+n*4;
    fringe.moveTo(x-4,y+3);fringe.quadraticCurveTo(x-3,y-h/2,x-5+n*5,y-h);
    fringe.lineTo(x,y-2);fringe.lineTo(x+2,y-h*.8);fringe.quadraticCurveTo(x+3,y,x+5,y+3);fringe.closePath();
  }
  return {canvas,fringe};
}

