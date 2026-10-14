/** Reusable square material tiles, independent of any town layout. */
export const TERRAIN_MATERIALS = {
  grass: { key: 'town-grass', sourceSize: 512, repeatX: 512, repeatY: 512 },
  paving: { key: 'town-paving', sourceSize: 512, repeatX: 256, repeatY: 224 },
} as const;
/** Feather only the boundary mask; never blur material pixels or tile detail. */
export function blendTerrainBoundary(mask:HTMLCanvasElement):HTMLCanvasElement {
  const out=document.createElement('canvas');out.width=mask.width;out.height=mask.height;
  const c=out.getContext('2d',{willReadFrequently:true})!;
  c.filter='blur(5px)';c.drawImage(mask,0,0);c.filter='none';
  const pixels=c.getImageData(0,0,out.width,out.height),d=pixels.data;
  for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
    const i=(y*out.width+x)*4,a=d[i+3]/255;
    if(a<=0||a>=1)continue;
    const n=Math.sin(x*.81+y*.43)*Math.cos(x*.23-y*.67);
    // Irregular short tongues and translucent moss along both sides of a path.
    d[i+3]=Math.round(Math.max(0,Math.min(1,(a-.18+n*.13)/.66))*255);
  }
  c.putImageData(pixels,0,0);return out;
}
