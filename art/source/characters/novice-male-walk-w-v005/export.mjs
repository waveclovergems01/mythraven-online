import fs from 'node:fs/promises';import sharp from 'sharp';
const dir='art/source/characters/novice-male-walk-w-v005';await fs.mkdir(dir+'/frames',{recursive:true});
const idle=await sharp(dir+'/idle-w.png').ensureAlpha().raw().toBuffer();const frames=[];
for(let i=0;i<8;i++)frames.push(await sharp(dir+'/walk-before.png').extract({left:i%4*240,top:Math.floor(i/4)*240,width:240,height:240}).ensureAlpha().raw().toBuffer());
function material(r,g,b,y){if(Math.max(r,g,b)<65)return null;if(b/g>.9&&Math.abs(r-g)<28)return 'steel';if(r>160&&g>125&&b>90&&g/r>.74)return y>166?'cuff':'ivory';if(r>170&&g/r<.77&&b<145)return null;if(r>105&&g/r>.61&&b/g<.57)return 'gold';if(r>g+8&&g>b+3)return y<158?'tunic':(r/g>1.5?'leather':'trousers');return null}
const labels=['steel','ivory','cuff','gold','tunic','leather','trousers'],samples={};
for(const label of labels)samples[label]={source:[[],[],[]],target:[[],[],[]]};
function collect(buf,target){for(let y=113;y<216;y++)for(let x=65;x<178;x++){const j=(y*240+x)*4;if(buf[j+3]<235)continue;const label=material(buf[j],buf[j+1],buf[j+2],y);if(!label)continue;for(let c=0;c<3;c++)samples[label][target][c].push(buf[j+c]);}}
collect(idle,'target');for(const f of frames)collect(f,'source');
for(const label of labels)for(const side of ['source','target'])for(const channel of samples[label][side])channel.sort((a,b)=>a-b);
function quantile(a,q){return a[Math.min(a.length-1,Math.max(0,Math.round(q*(a.length-1))))]}
const transforms={},stats={};
for(const label of labels){transforms[label]=[];stats[label]={nSource:samples[label].source[0].length,nIdle:samples[label].target[0].length,sourceMedian:[],idleMedian:[]};
for(let c=0;c<3;c++){const a=samples[label].source[c],b=samples[label].target[c];if(a.length<20||b.length<20)throw Error('Not enough material samples: '+label);const lo=quantile(a,.1),hi=quantile(a,.9),tl=quantile(b,.1),th=quantile(b,.9);const gain=Math.max(.8,Math.min(1.2,(th-tl)/(hi-lo||1))),offset=quantile(b,.5)-quantile(a,.5)*gain;transforms[label].push({gain,offset});stats[label].sourceMedian.push(quantile(a,.5));stats[label].idleMedian.push(quantile(b,.5));}}
const output=[],qa=[],gifs=[];
for(let i=0;i<8;i++){const base=frames[i],out=Buffer.from(base);let changed=0;
for(let y=111;y<240;y++)for(let x=0;x<240;x++){const j=(y*240+x)*4;if(!base[j+3])continue;const label=material(base[j],base[j+1],base[j+2],y);if(!label)continue;for(let c=0;c<3;c++){const {gain,offset}=transforms[label][c];out[j+c]=Math.max(0,Math.min(255,Math.round(base[j+c]*gain+offset)));}if(!out.subarray(j,j+3).equals(base.subarray(j,j+3)))changed++;}
idle.copy(out,0,0,111*240*4);
let alphaChanges=0;for(let j=111*240*4+3;j<out.length;j+=4)if(out[j]!==base[j])alphaChanges++;if(alphaChanges)throw Error('Body silhouette changed');
const name='frame-'+String(i+1).padStart(2,'0');const png=await sharp(out,{raw:{width:240,height:240,channels:4}}).png().toBuffer();await fs.writeFile(dir+'/frames/'+name+'.png',png);await sharp(png).resize(480,480,{kernel:'nearest'}).png().toFile(dir+'/frames/'+name+'-preview.png');gifs.push(await sharp(png).resize(480,480,{kernel:'nearest'}).flatten({background:'#303a35'}).ensureAlpha().raw().toBuffer());output.push(out);qa.push({frame:i+1,headPixelsExactToShippedIdle:out.subarray(0,111*240*4).equals(idle.subarray(0,111*240*4)),headWidth:38,bodyAlphaPixelsChanged:alphaChanges,recoloredBodyPixels:changed});}
const atlas=Buffer.alloc(960*480*4);output.forEach((p,i)=>{for(let y=0;y<240;y++)p.copy(atlas,((Math.floor(i/4)*240+y)*960+i%4*240)*4,y*240*4,(y+1)*240*4)});
await sharp(atlas,{raw:{width:960,height:480,channels:4}}).png().toFile(dir+'/novice-male-walk-w-v005.png');await sharp(Buffer.concat(gifs),{raw:{width:480,height:3840,channels:4,pageHeight:480}}).gif({loop:0,delay:Array(8).fill(100)}).toFile(dir+'/walk-preview.gif');
const comps=[await sharp(dir+'/idle-w.png').resize(480,480,{kernel:'nearest'}).png().toBuffer(),await sharp(dir+'/walk-before.png').extract({left:0,top:0,width:240,height:240}).resize(480,480,{kernel:'nearest'}).png().toBuffer(),await sharp(dir+'/frames/frame-01.png').resize(480,480,{kernel:'nearest'}).png().toBuffer()];
await sharp({create:{width:1440,height:480,channels:4,background:'#303a35'}}).composite(comps.map((input,i)=>({input,left:i*480,top:0}))).png().toFile(dir+'/comparison.png');
await fs.writeFile(dir+'/qa.json',JSON.stringify({frames:qa,materials:stats,transforms,method:'Exact unscaled shipped W idle head through y110. Existing authored body silhouettes and alpha retained; per-material pooled color normalization against shipped idle. One shared material transform across all eight poses.',inGameValidated:false,ownerApproved:false},null,2));console.log(stats);


