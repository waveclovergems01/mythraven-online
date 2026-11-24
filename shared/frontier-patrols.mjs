// Deterministic population seeds only. The server owns all subsequent wandering.
export function createPatrols(nav){
  const clearings=[{x:192,z:26},{x:189,z:9},{x:134,z:18},{x:122,z:41}];
  for(let row=0;row<7;row++)for(let col=0;col<8;col++)
    clearings.push({x:-194+col*55+7*Math.sin(row+col),z:-193+row*63+9*Math.cos(col*2+row)});
  const routes=[];
  function addRoute({x,z},i){
    const points=[];
    for(let n=0;n<96 && points.length<3;n++){
      const angle=i*1.71+n*2.4,r=3+(n*7+i)%10;
      const p={x:x+Math.cos(angle)*r,z:z+Math.sin(angle)*r};
      if(nav.canStand(p) && points.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>4 && nav.clearLine(p,q)))points.push(p);
    }
    if(points.length<3)return;
    const kind=i%3===1?'wolf':'rabbit';
    routes.push({id:kind+'-'+i,kind,index:i,spawn:points[0]});
  }
  clearings.forEach(addRoute);
  const total=routes.length*10;
  // Interleave low-discrepancy samples across the field; skip inaccessible land.
  for(let i=clearings.length;routes.length<total && i<total*12;i++){
    const x=((i*.75487766625)%1-.5)*420;
    const z=((i*.56984029099)%1-.5)*420;
    addRoute({x,z},i);
  }
  return routes;
}
