// Static map outlines in world coordinates. Sample the southernmost edge in
// the strip so players sort against the part of a footprint they overlap.
export function frontEdgeY(points,left,right=left) {
 let front=-Infinity;
 for(let i=0;i<points.length;i++){
  const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
  if(ax>=left&&ax<=right)front=Math.max(front,ay);
  for(const x of [left,right])if(ax!==bx&&x>=Math.min(ax,bx)&&x<=Math.max(ax,bx))front=Math.max(front,ay+(by-ay)*(x-ax)/(bx-ax));
 }
 return front;
}

export function containsPoint(x,y,points) {
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [ax,ay]=points[i],[bx,by]=points[j];
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}

export function touchesCell(points,left,top,width,height,margin=0) {
 const l=left-margin,r=left+width+margin,t=top-margin,b=top+height+margin;
 if([[l,t],[r,t],[l,b],[r,b]].some(([x,y])=>containsPoint(x,y,points)))return true;
 for(let i=0;i<points.length;i++){
  const a=points[i],c=points[(i+1)%points.length];
  if(a[0]>=l&&a[0]<=r&&a[1]>=t&&a[1]<=b)return true;
  let lo=0,hi=1;const dx=c[0]-a[0],dy=c[1]-a[1];
  for(const [p,q] of [[-dx,a[0]-l],[dx,r-a[0]],[-dy,a[1]-t],[dy,b-a[1]]]){
   if(p===0){if(q<0){hi=-1;break;}}else if(p<0)lo=Math.max(lo,q/p);else hi=Math.min(hi,q/p);
  }
  if(lo<=hi)return true;
 }
 return false;
}
