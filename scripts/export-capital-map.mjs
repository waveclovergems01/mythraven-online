import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {GATES} from '../shared/fortifications.mjs';

// Maintained layout exporter: concept colors supply coverage, never surface detail.
const source='art/source/maps/capital-layout.png',out='public/assets/maps';
await mkdir(out,{recursive:true});
const {data,info}=await sharp(source).removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:w,height:h}=info,n=w*h;
const land=new Uint8Array(n),grass=new Uint8Array(n);
for(let i=0;i<n;i++){
 const r=data[i*3],g=data[i*3+1],b=data[i*3+2];
 land[i]=Number(!(b>r*1.12&&g>r*1.05));
 grass[i]=Math.round(Math.max(0,Math.min(1,(g-r*.90)/24))*255);
}
// Remove painted foam specks. Bridges now connect the island to outer land.
const visited=new Uint8Array(n),queue=new Int32Array(n);
for(let start=0;start<n;start++){
 if(!land[start]||visited[start])continue;
 let head=0,tail=1;queue[0]=start;visited[start]=1;
 while(head<tail){
  const p=queue[head++],x=p%w,y=Math.floor(p/w);
  for(const q of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1]){
   if(q>=0&&land[q]&&!visited[q]){visited[q]=1;queue[tail++]=q;}
  }
 }
 if(tail<80)for(let i=0;i<tail;i++)land[queue[i]]=0;
}
const erode=(pixels,radius)=>{
 const result=new Uint8Array(n);
 for(let y=radius;y<h-radius;y++)for(let x=radius;x<w-radius;x++){
  let solid=1;
  outer:for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
   if(!pixels[(y+dy)*w+x+dx]){solid=0;break outer;}
  }
  result[y*w+x]=solid;
 }
 return result;
};
const connectedLand=land.slice();
for(const {bridge:[l,t,r,b]} of GATES)for(let y=t;y<b;y++)for(let x=l;x<r;x++)connectedLand[y*w+x]=1;
const safeIsland=erode(connectedLand,3);
const writeAlpha=async(name,values,blur=0,width=w,height=h)=>{
 const rgba=Buffer.alloc(width*height*4,255);for(let i=0;i<values.length;i++)rgba[i*4+3]=values[i];
 let image=sharp(rgba,{raw:{width,height,channels:4}});
 if(blur)image=image.blur(blur);
 await image.png().toFile(`${out}/${name}.png`);
};
// Reconstruct a rounded contour at 2x mask resolution, avoiding enlarged
// one-pixel staircase edges. Navigation retains a conservative 3px inset.
const contour=await sharp(Buffer.from(land.map(v=>v*255)),{raw:{width:w,height:h,channels:1}}).blur(1.2).resize(w*2,h*2).greyscale().raw().toBuffer();
const smoothLand=await sharp(contour,{raw:{width:w*2,height:h*2,channels:1}}).threshold(128).blur(.55).greyscale().raw().toBuffer();
const inner=await sharp(smoothLand,{raw:{width:w*2,height:h*2,channels:1}}).erode(4).greyscale().raw().toBuffer();
await writeAlpha('mythraven-land',smoothLand,0,w*2,h*2);
await writeAlpha('mythraven-grass-mask',grass,1.1);
await writeAlpha('mythraven-banks',smoothLand.map((v,i)=>Math.round(Math.max(0,v-inner[i])*.55)),.55,w*2,h*2);
await sharp(Buffer.from(safeIsland.map(v=>v*255)),{raw:{width:w,height:h,channels:1}}).png().toFile(`${out}/mythraven-navigation.png`);

// Editable layout paths traced from the selected 1448x1086 preview.
const roads=[
 [38,'M35 490 L250 490'],[38,'M1230 490 L1435 490'],[38,'M740 850 L740 1055'],
 [30,'M740 236 L740 904'],[28,'M158 482 Q420 495 740 490 L1310 490'],
 [14,'M300 161 L292 266 Q290 296 328 296 L432 299 Q550 315 582 263 L619 239'],
 [12,'M306 169 Q377 164 435 205 Q477 187 532 194 L532 135'],
 [12,'M435 205 L405 390 L389 850'],
 [12,'M295 294 Q241 350 199 394 L171 450 L165 482'],
 [12,'M200 400 L551 393 Q613 380 610 337'],
 [12,'M551 338 L545 475'],
 [12,'M579 263 Q602 325 634 343 Q685 371 735 375'],
 [12,'M539 493 Q537 552 585 562 Q650 579 680 610 L738 620'],
 [12,'M194 496 Q180 540 214 574 L232 593 L390 610 L544 615 Q570 620 581 661 L575 855'],
 [10,'M220 575 L181 605 L281 598'],
 [12,'M270 488 Q295 562 305 616 Q333 670 297 720 L258 736 L740 740'],
 [12,'M389 743 Q454 789 546 810 L575 810'],
 [12,'M580 738 Q617 797 633 849 Q661 883 740 880'],
 [12,'M812 242 Q871 219 903 205 Q950 187 980 202 L1098 218'],
 [12,'M981 132 Q988 171 964 194'],
 [10,'M1071 132 Q1105 169 1098 218'],
 [14,'M1099 219 Q1236 204 1251 270 Q1267 310 1207 319 L1104 316'],
 [12,'M1099 218 L1105 430 L1120 490 L1107 618 L1100 742'],
 [12,'M833 275 Q842 343 876 345 Q900 342 920 324 Q979 294 1025 318 L1105 318'],
 [12,'M741 397 Q844 403 881 386 Q913 363 940 360 L945 480'],
 [12,'M1171 321 Q1178 371 1229 381 L1279 395 L1296 484'],
 [10,'M1278 395 Q1291 356 1317 351'],
 [12,'M944 359 L1016 390 Q1025 443 1095 449'],
 [12,'M941 491 Q943 550 889 569 Q860 590 859 642 Q850 669 815 688 L741 700'],
 [12,'M1110 533 Q1120 584 1099 618 L968 616 Q941 615 916 649 L859 648'],
 [12,'M1283 490 Q1301 551 1264 568 L1199 585 Q1164 615 1186 642 L1263 681 L1286 824'],
 [12,'M1100 744 Q1120 703 1173 699 Q1237 710 1242 776 Q1252 824 1186 822 L1056 820 Q985 819 992 778 Q999 743 1038 741 L1100 744'],
 [14,'M741 742 L1038 742'],
 [12,'M909 746 Q888 790 886 830 Q869 880 741 880'],
 [10,'M1243 790 L1300 842'],[10,'M1095 821 L1094 875 L1081 905'],
];
const courts=[
 'M580 103 L649 103 L649 82 L848 82 L848 102 L943 102 L943 157 Q943 180 921 180 L832 180 L832 237 L654 237 L654 177 L598 177 Q577 177 577 157 Z',
 'M700 417 L798 417 L798 448 L836 448 L853 467 L853 527 L819 545 L798 545 L798 574 L700 574 L700 547 L664 547 L649 528 L649 465 L670 448 L700 448 Z',
 'M358 468 L420 468 L447 489 L447 518 L421 537 L361 537 L336 520 L336 490 Z',
 'M1085 444 L1139 444 L1155 462 L1155 478 L1180 478 L1180 520 L1154 520 L1154 539 L1084 539 L1060 519 L1060 465 Z',
 'M682 704 L787 704 L810 728 L829 741 L829 766 L790 798 L686 798 L649 768 L649 734 Z',
 'M366 709 L418 709 L443 731 L443 757 L421 781 L361 781 L337 760 L337 735 Z',
 'M385 372 L437 372 L450 390 L450 408 L433 425 L384 425 L369 409 L369 390 Z',
 'M1079 198 L1118 198 L1134 213 L1134 236 L1075 236 L1063 218 Z',
 'M1084 299 L1123 299 L1143 314 L1143 333 L1122 350 L1086 350 L1063 333 L1063 316 Z',
 'M369 602 L409 602 L424 618 L424 644 L374 644 L359 628 Z',
 'M1092 601 L1124 601 L1139 617 L1139 642 L1088 642 L1075 627 Z',
];
const svg=(content)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1448 1086">${content}</svg>`);
await sharp(svg(roads.map(([width,d])=>`<path d="${d}" fill="none" stroke="white" stroke-width="${width}" stroke-linecap="butt" stroke-linejoin="round"/>`).join(''))).png().toFile(`${out}/mythraven-roads.png`);
await sharp(svg(courts.map(d=>`<path d="${d}" fill="white"/>`).join(''))).png().toFile(`${out}/mythraven-courts.png`);
console.log(`Capital masks exported ${w}x${h}; safe land and bridges ${safeIsland.reduce((a,b)=>a+b,0)} pixels.`);
