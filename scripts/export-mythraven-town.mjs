import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
const root='art/source/maps/mythraven-town/';
const out='public/assets/maps';
await mkdir(out,{recursive:true});
await sharp(root+'mythraven-town-sand-v004.png').png().toFile(out+'/mythraven-dirt.png');
await sharp('art/source/tiles/mythraven-grass-overlay/grass-v001.png').png().toFile('public/assets/tiles/mythraven-grass.png');
const {data,info}=await sharp(root+'mythraven-town-sand-v004.png').removeAlpha().raw().toBuffer({resolveWithObject:true});
const mask=Buffer.alloc(info.width*info.height*4),nav=Buffer.alloc(info.width*info.height*3);
const smooth=t=>t*t*(3-2*t);
const rand=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+19.4)*43758.5453;return n-Math.floor(n);};
const noise=(x,y)=>{const a=Math.floor(x),b=Math.floor(y),u=smooth(x-a),v=smooth(y-b);return (rand(a,b)*(1-u)+rand(a+1,b)*u)*(1-v)+(rand(a,b+1)*(1-u)+rand(a+1,b+1)*u)*v;};
const levels={bare:0,partial:0,full:0};
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
 const i=y*info.width+x,[r,g,b]=data.subarray(i*3,i*3+3);
 const water=b>r*1.18&&g>r*1.08;
 nav.fill(water?0:255,i*3,i*3+3);
 // Only ochre soil gets grass; pale paving, blue water and dark bank faces stay clear.
 const soil=r>g*1.14&&g>b*1.2&&r>155;
 const n=noise(x/145,y/145)*.72+noise(x/58,y/58)*.28;
 const coverage=smooth(Math.max(0,Math.min(1,(n-.30)/.38)));
 // Broad central lawn stays lush; fade the boost out before the outer banks.
 const centralRadius=Math.max(Math.abs(x/info.width-.5)/.34,Math.abs(y/info.height-.49)/.36);
 const centralWeight=1-smooth(Math.max(0,Math.min(1,(centralRadius-.65)/.35)));
 const paintedCoverage=coverage+(1-coverage)*.92*centralWeight;
 const alpha=soil?Math.round(paintedCoverage*255):0;
 mask[i*4]=mask[i*4+1]=mask[i*4+2]=255;mask[i*4+3]=alpha;
 if(soil){if(alpha<25)levels.bare++;else if(alpha>245)levels.full++;else levels.partial++;}
}
// Keep narrow brown mortar gaps free of grass by requiring a soil neighborhood.
const stride=info.width+1, nonsoil=new Uint32Array(stride*(info.height+1));
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
 const j=(y*info.width+x)*3,r=data[j],g=data[j+1],b=data[j+2],i=(y+1)*stride+x+1;
 const soil=r>g*1.14&&g>b*1.2&&r>155;
 nonsoil[i]=Number(!soil)+nonsoil[i-1]+nonsoil[i-stride]-nonsoil[i-stride-1];
}
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
 const l=Math.max(0,x-4),r=Math.min(info.width,x+5),t=Math.max(0,y-4),b=Math.min(info.height,y+5);
 if(nonsoil[b*stride+r]-nonsoil[t*stride+r]-nonsoil[b*stride+l]+nonsoil[t*stride+l]>0)mask[(y*info.width+x)*4+3]=0;
}
await sharp(mask,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(out+'/mythraven-grass-mask.png');
await sharp(nav,{raw:{width:info.width,height:info.height,channels:3}}).png().toFile(out+'/mythraven-navigation.png');
await writeFile(root+'integration.json',JSON.stringify({status:'integrated',source:'mythraven-town-sand-v004.png',grass:'art/source/tiles/mythraven-grass-overlay/grass-v001.png',mask:'public/assets/maps/mythraven-grass-mask.png',navigation:'public/assets/maps/mythraven-navigation.png',dimensions:info,coveragePixels:levels,notes:'Central lawn boosted to 92-100% coverage; outermost coverage unchanged. Deterministic soft coverage, soil-only; water classification navigation is conservative per movement cell. Objects not added.'},null,2));
console.log(levels);


