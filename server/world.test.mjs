import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {configureNavigation,walkable,canStep,findPath,SPAWN,MAP_COLUMNS,MAP_ROWS} from '../shared/town-grid.mjs';
const {data,info}=await sharp(fileURLToPath(new URL('../public/assets/maps/mythraven-navigation.png',import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
configureNavigation({data,width:info.width,height:info.height});
test('shared town blocks water and basin but permits a connected detour',()=>{
 assert.equal(walkable(SPAWN),true);
 for(const c of [{x:-1,y:0},{x:MAP_COLUMNS,y:0},{x:60,y:50},{x:7,y:50}])assert.equal(walkable(c),false);
 const a={x:52,y:50},b={x:68,y:50},route=findPath(a,b);assert.ok(route.length>0);
 let previous=a;for(const c of route){assert.ok(walkable(c));assert.ok(canStep(previous,c));previous=c;}
 assert.deepEqual(route.at(-1),b);assert.deepEqual(findPath(SPAWN,{x:60,y:50}),[]);
 assert.equal(MAP_COLUMNS,120);assert.equal(MAP_ROWS,103);
});
