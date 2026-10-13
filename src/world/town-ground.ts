import Phaser from 'phaser';
import { attachWater } from './water';
import { MAP_WIDTH, MAP_HEIGHT, island, bridgeBounds, walkable, cellAt } from './daflak-grid';

export const GROUND_COVER = ['clover','leaves','tufts','earth'] as const;
export const FLOWERS = ['yellow','clover','tulip'] as const;
export const MATERIALS = ['grass','paving','plaza','water','bank'] as const;

/** Material size stays fixed in world units; larger maps repeat instead of magnifying. */
export function buildTownGround(scene: Phaser.Scene): string {
  const sources = Object.fromEntries(MATERIALS.map(name => [name,
    scene.textures.get(`terrain-${name}`).getSourceImage() as HTMLImageElement]));
  const flowers=FLOWERS.map(name=>scene.textures.get(`flower-${name}`).getSourceImage() as HTMLImageElement);
  const groundCover=GROUND_COVER.map(name=>scene.textures.get(`groundcover-${name}`).getSourceImage() as HTMLImageElement);
  const random=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);};
  // Build small runtime crop masks once, reused by every ground chunk and minimap.
  // These are views of the existing earth image, not additional art files.
  const earth=groundCover[3];
  const earthViews: CanvasImageSource[]=[earth];
  for(let i=0;i<8;i++){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const context=canvas.getContext('2d')!;
    const fraction=.28+random(61001+i*19)*.30;
    const centerX=.38+random(61002+i*19)*.24;
    const centerY=.38+random(61003+i*19)*.24;
    context.drawImage(earth,(centerX-fraction/2)*earth.width,(centerY-fraction/2)*earth.height,
      fraction*earth.width,fraction*earth.height,0,0,256,256);
    // Feather the crop boundary so partial patches never expose rectangular cuts.
    const mask=context.createRadialGradient(128,128,65,128,128,126);
    mask.addColorStop(0,'#fff');mask.addColorStop(.55,'#ffffffb3');mask.addColorStop(1,'#ffffff00');
    context.globalCompositeOperation='destination-in';
    context.fillStyle=mask;context.fillRect(0,0,256,256);
    earthViews.push(canvas);
  }
  const bridge = bridgeBounds();
  const cx = (bridge.left+bridge.right)/2, cy = (bridge.top+bridge.bottom)/2;
  function landPath(ctx: CanvasRenderingContext2D, inset = 0, offsetY = 0) {
    ctx.beginPath();
    island.forEach(([x,y],i) => {
      const px = x*MAP_WIDTH + (0.5-x)*inset;
      const py = y*MAP_HEIGHT + (0.5-y)*inset + offsetY;
      if(i===0)ctx.moveTo(px,py); else ctx.lineTo(px,py);
    });
    ctx.closePath();
  }
  attachWater(scene, sources.water);
  function draw(ctx: CanvasRenderingContext2D, includeWater = false) {
    const patterns = Object.fromEntries(MATERIALS.map(name=>[name,ctx.createPattern(sources[name],'repeat')!]));
    // Ground-plane foreshortening applies to textures, not standing character art.
    patterns.paving.setTransform(new DOMMatrix().scale(1,.875));
    patterns.plaza.setTransform(new DOMMatrix().scale(1,.70));
    // One fixed orientation and scale: no rotated or blended lawn patches.
    patterns.grass.setTransform(new DOMMatrix().scale(1.8,1.575));
    if(includeWater){ctx.fillStyle=patterns.water;ctx.fillRect(0,0,MAP_WIDTH,MAP_HEIGHT);}
    // Project the bank down/right: ground top and vertical stone faces are separate.
    landPath(ctx,-24,88);ctx.fillStyle='#102f3966';ctx.fill();
    landPath(ctx,0,64);ctx.fillStyle=patterns.bank;ctx.fill();
    const vertices=island.map(([x,y])=>[x*MAP_WIDTH,y*MAP_HEIGHT]);
    for(let i=0;i<vertices.length;i++){
      const [ax,ay]=vertices[i], [bx,by]=vertices[(i+1)%vertices.length];
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);
      ctx.lineTo(bx+18,by+64);ctx.lineTo(ax+18,ay+64);ctx.closePath();
      ctx.fillStyle=patterns.bank;ctx.fill();
      ctx.fillStyle=bx<ax?'#202c354d':'#18293473';ctx.fill();
      ctx.strokeStyle='#314840';ctx.lineWidth=3;ctx.stroke();
    }
    landPath(ctx);ctx.fillStyle=patterns.grass;ctx.fill();
    ctx.strokeStyle=patterns.bank;ctx.lineWidth=20;ctx.stroke();
    ctx.strokeStyle='#b9b68b';ctx.lineWidth=4;ctx.stroke();
    // Broken moss and small waterline ripples, deterministic across cached chunks.
    for(let i=0;i<vertices.length;i++){
      const [ax,ay]=vertices[i], [bx,by]=vertices[(i+1)%vertices.length];
      const count=Math.ceil(Math.hypot(bx-ax,by-ay)/36);
      for(let j=0;j<count;j++){
        const f=j/count,x=ax+(bx-ax)*f,y=ay+(by-ay)*f;
        ctx.fillStyle=j%3?'#526740':'#7e8e52';
        ctx.beginPath();ctx.ellipse(x,y+4,9+(j%4)*2,4+(j%3),0,0,Math.PI*2);ctx.fill();
        if(j%3===0){ctx.beginPath();ctx.ellipse(x+20,y+76,16,3,0,0,Math.PI);
          ctx.strokeStyle='#90c9bd66';ctx.lineWidth=2;ctx.stroke();}
      }
    }
    ctx.save(); landPath(ctx);ctx.clip();
    const edges: {a:number[];b:number[];width:number}[]=[];
    const road = (points: number[][], width: number) => {
      for(let i=1;i<points.length;i++){
        const [ax,ay]=points[i-1],[bx,by]=points[i];
        edges.push({a:[ax,ay],b:[bx,by],width});
        const length=Math.hypot(bx-ax,by-ay),nx=-(by-ay)/length,ny=(bx-ax)/length;
        const count=Math.max(1,Math.ceil(length/18));
        // Irregular painted edge replaces the straight raised curb.
        ctx.beginPath();
        for(const side of [1,-1])for(let j=0;j<=count;j++){
          const f=(side===1?j:count-j)/count;
          const x=ax+(bx-ax)*f,y=ay+(by-ay)*f;
          const wobble=3*Math.sin(x*.12+y*.08)+2*Math.cos(y*.19-x*.07);
          const px=x+nx*(width/2+wobble)*side,py=y+ny*(width/2+wobble)*side;
          if(side===1&&j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.closePath();
        ctx.strokeStyle='#70644740';ctx.lineWidth=10;ctx.stroke();
        ctx.fillStyle=patterns.paving;ctx.fill();
        ctx.save();ctx.globalAlpha=.55;ctx.strokeStyle=patterns.grass;ctx.lineWidth=7;ctx.stroke();ctx.restore();
      }
      // Fill joins after edge blending so adjacent strokes do not leave grass seams.
      ctx.fillStyle=patterns.paving;
      for(const [x,y] of points){ctx.beginPath();ctx.ellipse(x,y,width*.49,width*.49,0,0,Math.PI*2);ctx.fill();}
    };
    road([[0,cy],[MAP_WIDTH,cy]],bridge.bottom-bridge.top);
    road([[cx,0],[cx,MAP_HEIGHT]],bridge.right-bridge.left);
    const rx=Math.min(MAP_WIDTH*.23,1100),ry=Math.min(MAP_HEIGHT*.23,960);
    const ring=[[-.6,-1],[.6,-1],[1,-.6],[1,.6],[.6,1],[-.6,1],[-1,.6],[-1,-.6]].map(([x,y])=>[cx+x*rx,cy+y*ry]);
    road([...ring,ring[0]],128);
    // Diagonal approaches produce buildable wedges around a distinct flagstone plaza.
    for(const [x,y] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
      road([[cx+x*rx*.8,cy+y*ry*.8],[cx+x*250,cy+y*164]],128);
    }
    const patio=[[-272,-231],[272,-231],[352,-179],[352,179],[272,231],[-272,231],[-352,179],[-352,-179]];
    ctx.beginPath();patio.forEach(([x,y],i)=>i?ctx.lineTo(cx+x,cy+y):ctx.moveTo(cx+x,cy+y));ctx.closePath();
    ctx.strokeStyle='#776e5140';ctx.lineWidth=12;ctx.stroke();
    ctx.fillStyle=patterns.plaza;ctx.fill();
    ctx.save();ctx.globalAlpha=.55;ctx.strokeStyle=patterns.grass;ctx.lineWidth=10;ctx.stroke();ctx.restore();
    // Overgrowth is a decorative overlay, independent of movement cells.
    const inPatio=(x:number,y:number)=>{
      let inside=false;
      for(let i=0,j=patio.length-1;i<patio.length;j=i++){
        const [ax,ay]=patio[i],[bx,by]=patio[j];
        if((ay>y-cy)!==(by>y-cy)&&x-cx<(bx-ax)*(y-cy-ay)/(by-ay)+ax)inside=!inside;
      }return inside;
    };
    const onPaving=(x:number,y:number)=>inPatio(x,y)||edges.some(({a,b,width})=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],f=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
      return Math.hypot(x-a[0]-dx*f,y-a[1]-dy*f)<width/2+5;
    });
    const fringe=(a:number[],b:number[],offset:number)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
      for(let d=12;d<length;d+=32){
        const x=a[0]+dx*d/length,y=a[1]+dy*d/length;
        const noise=(Math.sin(x*.037+y*.053)+1)/2;
        if(noise<.22)continue;
        for(const side of [-1,1]){
          const ex=x+nx*offset*side,ey=y+ny*offset*side;
          if(onPaving(ex+nx*side*24,ey+ny*side*24))continue;
          if(!onPaving(ex-nx*side*12,ey-ny*side*12))continue;
          const patch=new Path2D(),r=14+noise*14;
          for(let k=0;k<12;k++){
            const angle=k*Math.PI/6,rr=r*(k%2?.65:1);
            const px=ex+Math.cos(angle)*rr,py=ey+Math.sin(angle)*rr*.8;
            if(k===0)patch.moveTo(px,py);else patch.lineTo(px,py);
          }patch.closePath();
          ctx.save();ctx.translate(2,3);ctx.fillStyle='#26352f44';ctx.fill(patch);ctx.restore();
          ctx.fillStyle=patterns.grass;ctx.fill(patch);
        }
      }
    };
    for(const {a,b,width} of edges)fringe(a,b,width/2-3);
    for(let i=0;i<patio.length;i++){
      const a=patio[i],b=patio[(i+1)%patio.length];fringe([cx+a[0],cy+a[1]],[cx+b[0],cy+b[1]],0);
    }
    // Northern castle reservation: flat paving only, still fully walkable.
    // Its south edge joins the northern ring road and its center preserves the gate route.
    const courtWidth=rx*1.2, courtHeight=Math.min(760,MAP_HEIGHT*.16);
    const courtX=cx-courtWidth/2, courtBottom=cy-ry+84, courtY=courtBottom-courtHeight;
    ctx.fillStyle=patterns.paving;ctx.fillRect(courtX-24,courtY-20,courtWidth+48,courtHeight+40);
    ctx.fillStyle=patterns.plaza;ctx.fillRect(courtX,courtY,courtWidth,courtHeight);
    ctx.strokeStyle='#867c5b';ctx.lineWidth=3;ctx.strokeRect(courtX+6,courtY+6,courtWidth-12,courtHeight-12);
    ctx.strokeStyle='#d9ccab';ctx.lineWidth=3;ctx.strokeRect(courtX+12,courtY+12,courtWidth-24,courtHeight-24);
    // Separate flower decals: stable clusters with broad empty spaces between them.
    // Reject the whole footprint on roads, the court, banks and water.
    const clearGrass=(x:number,y:number,r:number)=>{
      if(x+r>courtX-30&&x-r<courtX+courtWidth+30&&y+r>courtY-26&&y-r<courtBottom+26)return false;
      return [[0,0],[-r,-r],[r,-r],[-r,r],[r,r]].every(([dx,dy])=>
        walkable(cellAt(x+dx,y+dy))&&!onPaving(x+dx,y+dy));
    };
    // Seeded orientations, sizes and partial views break up the repeated diagonal motif.
    for(let i=0;i<Math.round(MAP_WIDTH*MAP_HEIGHT/320000);i++){
      const seed=i*59+50001;
      const x=(.15+random(seed)*.7)*MAP_WIDTH;
      const y=(.15+random(seed+1)*.7)*MAP_HEIGHT;
      const partial=random(seed+2)<.7;
      const width=partial?90+random(seed+3)*190:180+random(seed+3)*190;
      const height=width*(partial?.65+random(seed+4)*.4:.6+random(seed+4)*.3);
      const angle=random(seed+5)*Math.PI*2;
      // Circumscribed footprint includes every rotation and excludes paved/water areas.
      if(!clearGrass(x,y,Math.hypot(width,height)/2+10))continue;
      const view=partial?earthViews[1+Math.floor(random(seed+6)*8)]:earthViews[0];
      ctx.save();ctx.translate(x,y);ctx.scale(1,.875);ctx.rotate(angle);
      ctx.globalAlpha=.72+random(seed+7)*.28;
      ctx.drawImage(view,-width/2,-height/2,width,height);
      ctx.restore();
    }
    // Low creeping foliage fills irregular patches underneath standing game objects.
    // Independent seeded placement keeps chunks and the minimap aligned.
    const coverGroups=Math.round(MAP_WIDTH*MAP_HEIGHT/200000);
    for(let group=0;group<coverGroups;group++){
      const gx=(.12+random(group*43+17001)*.76)*MAP_WIDTH;
      const gy=(.13+random(group*43+17002)*.74)*MAP_HEIGHT;
      const count=4+Math.floor(random(group*43+17003)*6);
      for(let i=0;i<count;i++){
        const seed=27001+group*137+i*17;
        const angle=random(seed)*Math.PI*2,radius=Math.sqrt(random(seed+1))*180;
        const x=gx+Math.cos(angle)*radius,y=gy+Math.sin(angle)*radius*.875;
        const width=55+random(seed+2)*65,height=width*.75;
        if(!clearGrass(x,y,width*.55+10))continue;
        ctx.drawImage(groundCover[(group+i)%3],x-width/2,y-height/2,width,height);
      }
    }
    const groups=Math.round(MAP_WIDTH*MAP_HEIGHT/250000);
    for(let group=0;group<groups;group++){
      const gx=(.14+random(group*31+7)*.72)*MAP_WIDTH;
      const gy=(.16+random(group*31+8)*.68)*MAP_HEIGHT;
      const count=10+Math.floor(random(group*31+9)*12);
      for(let i=0;i<count;i++){
        const seed=group*101+i*13;
        const angle=random(seed+1)*Math.PI*2, radius=Math.sqrt(random(seed+2))*125;
        const x=gx+Math.cos(angle)*radius,y=gy+Math.sin(angle)*radius*.875;
        const size=44+random(seed+3)*28;
        if(!clearGrass(x,y,size*.6+18))continue;
        const flower=flowers[(group+i)%flowers.length];
        ctx.drawImage(flower,x-size/2,y-size/2,size,size);
      }
    }
    ctx.restore();
    // Visible bridge aprons over the water, beneath the walkable deck.
    const facade=(x:number,y:number,w:number)=>{
      ctx.fillStyle='#152d3566';ctx.fillRect(x+16,y+15,w,86);
      ctx.fillStyle=patterns.bank;ctx.fillRect(x,y,w,72);
      ctx.fillStyle='#18293555';ctx.fillRect(x,y,w,72);
      for(let px=x+36;px<x+w-28;px+=86){
        ctx.beginPath();ctx.moveTo(px-24,y+72);ctx.lineTo(px-24,y+42);
        ctx.arc(px,y+42,24,Math.PI,0);ctx.lineTo(px+24,y+72);ctx.closePath();
        ctx.fillStyle='#173f49';ctx.fill();ctx.lineWidth=7;ctx.strokeStyle='#969077';ctx.stroke();
        ctx.fillStyle='#9fcbb94d';ctx.fillRect(px-16,y+70,32,2);
      }
      ctx.fillStyle='#c2b18b';ctx.fillRect(x,y,w,7);
    };
    facade(0,bridge.bottom,MAP_WIDTH*.095);
    facade(MAP_WIDTH*.905,bridge.bottom,MAP_WIDTH*.095);
    // Bridge surfaces and collision share exact coordinates. Rails stay outside decks.
    ctx.fillStyle=patterns.paving;
    ctx.fillRect(bridge.left,0,bridge.right-bridge.left,MAP_HEIGHT*.21);
    ctx.fillRect(bridge.left,MAP_HEIGHT*.79,bridge.right-bridge.left,MAP_HEIGHT*.21);
    ctx.fillRect(0,bridge.top,MAP_WIDTH*.16,bridge.bottom-bridge.top);
    ctx.fillRect(MAP_WIDTH*.84,bridge.top,MAP_WIDTH*.16,bridge.bottom-bridge.top);
    const rail=(x:number,y:number,w:number,h:number)=>{
      ctx.fillStyle='#142a304d';ctx.fillRect(x+12,y+18,w+6,h+6);
      ctx.fillStyle=patterns.bank;ctx.fillRect(x,y+7,w,h+12);
      ctx.fillStyle=patterns.bank;ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#c7b995';ctx.fillRect(x,y,w,4);
      // Capstones make the parapet read as a low wall, not a painted line.
      const vertical=h>w, length=vertical?h:w;
      for(let d=0;d<length;d+=96){
        const px=x+(vertical?-4:d),py=y+(vertical?d:-4);
        ctx.fillStyle=patterns.bank;ctx.fillRect(px,py,20,22);
        ctx.fillStyle='#d2c5a0';ctx.fillRect(px-2,py-4,24,9);
        ctx.fillStyle='#796f57';ctx.fillRect(px,py+5,20,5);
      }
    };
    for(const x of [bridge.left-12,bridge.right]){
      rail(x,0,12,MAP_HEIGHT*.12);rail(x,MAP_HEIGHT*.87,12,MAP_HEIGHT*.13);
    }
    for(const y of [bridge.top-12,bridge.bottom]){
      rail(0,y,MAP_WIDTH*.095,12);rail(MAP_WIDTH*.905,y,MAP_WIDTH*.095,12);
    }
  }
  // 512px chunks keep GPU textures small. At zoom 0.5 each cached pixel is one CSS px.
  const keys:string[]=[];
  for(let y=0;y<MAP_HEIGHT/2;y+=512) for(let x=0;x<MAP_WIDTH/2;x+=512){
    const canvas=document.createElement('canvas');
    canvas.width=Math.min(513,MAP_WIDTH/2-x);canvas.height=Math.min(513,MAP_HEIGHT/2-y);
    const ctx=canvas.getContext('2d')!;
    ctx.translate(-x,-y);ctx.scale(.5,.5);draw(ctx);
    const key=`town-ground-${x}-${y}`;keys.push(key);
    scene.textures.addCanvas(key,canvas);
    scene.add.image(x*2,y*2,key).setOrigin(0).setScale(2).setDepth(0);
  }
  const mini=document.createElement('canvas');
  const scale=512/Math.max(MAP_WIDTH,MAP_HEIGHT);
  mini.width=Math.round(MAP_WIDTH*scale);mini.height=Math.round(MAP_HEIGHT*scale);
  const context=mini.getContext('2d')!;context.scale(scale,scale);draw(context,true);
  const minimapUrl=mini.toDataURL('image/png');
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>keys.forEach(key=>scene.textures.remove(key)));
  return minimapUrl;
}
