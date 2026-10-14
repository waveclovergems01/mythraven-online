/** Eight-direction A*: costs are world distances, including rectangular cells. */
export function canStep(from,to,isWalkable){
 const dx=to.x-from.x,dy=to.y-from.y;
 return Math.max(Math.abs(dx),Math.abs(dy))===1&&isWalkable(from)&&isWalkable(to)
  &&(!(dx&&dy)||(isWalkable({x:from.x+dx,y:from.y})&&isWalkable({x:from.x,y:from.y+dy})));
}
export function shortestPath(start,end,{columns,rows,width,height,walkable}){
 const valid=c=>Number.isInteger(c?.x)&&Number.isInteger(c?.y)&&c.x>=0&&c.y>=0&&c.x<columns&&c.y<rows&&walkable(c);
 if(!valid(start)||!valid(end))return [];
 const id=c=>c.y*columns+c.x,point=i=>({x:i%columns,y:Math.floor(i/columns)});
 const diagonal=Math.hypot(width,height);
 const heuristic=c=>{const dx=Math.abs(end.x-c.x),dy=Math.abs(end.y-c.y),d=Math.min(dx,dy);return d*diagonal+(dx-d)*width+(dy-d)*height;};
 const cost=new Float64Array(columns*rows).fill(Infinity),parent=new Int32Array(columns*rows).fill(-1),heap=[];
 const before=(a,b)=>a.f<b.f||(a.f===b.f&&a.h<b.h);
 const push=n=>{heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(!before(n,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=n;};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&before(heap[child+1],heap[child]))child++;if(!before(heap[child],last))break;heap[i]=heap[child];i=child;}heap[i]=last;}return top;};
 const startId=id(start),endId=id(end);cost[startId]=0;push({id:startId,g:0,h:heuristic(start),f:heuristic(start)});
 while(heap.length){
  const node=pop();if(node.g>cost[node.id])continue;
  if(node.id===endId){const route=[];for(let n=endId;n!==startId;n=parent[n])route.push(point(n));return route.reverse();}
  const current=point(node.id);
  for(const [dx,dy] of [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]){
   const next={x:current.x+dx,y:current.y+dy};if(!canStep(current,next,valid))continue;
   const ni=id(next),g=node.g+(dx&&dy?diagonal:dx?width:height);
   if(g>=cost[ni])continue;cost[ni]=g;parent[ni]=node.id;const h=heuristic(next);push({id:ni,g,h,f:g+h});
  }
 }
 return [];
}
