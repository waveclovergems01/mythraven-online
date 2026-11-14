export type BridgeVisual={id:string;axis:string;left:number;right:number;top:number;bottom:number;scaleX:number;scaleY:number;x:number;y:number;sourceWidth:number;sourceHeight:number;texture:string};
export function createBridgeSurface(width:number,height:number):{
 bridges:BridgeVisual[];
 project:(x:number,y:number)=>{x:number;y:number};
 unproject:(x:number,y:number)=>{x:number;y:number};
};
