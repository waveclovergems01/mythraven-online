import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { TerrainRoom, configureTerrainWorld } from './terrain-room.mjs';
import { buildTerrainData, layoutToWorld, TERRAIN, groundVariation, smoothstep } from '../shared/terrain-data.mjs';
import { createTreePlacements, isTreeCellClear } from '../shared/terrain-props.mjs';
import { TerrainMovement, TURN_SPEED, WALK_SPEED, speedMultiplier, PLAYER_RADIUS, angleDifference } from '../shared/terrain-movement.mjs';
import { createFortifications, fortificationSurface, isFortificationClear } from '../shared/terrain-fortifications.mjs';
import {createCityLayout,isBuildingClear,isCityPlantingClear} from '../shared/city-layout.mjs';
import {buildWestMarch, FIELD_CROSSINGS, FIELD_LIMIT, FIELD_PORTAL} from '../shared/west-march.mjs';
const image = await sharp(fileURLToPath(new URL('../public/assets/maps/mythraven-land.png', import.meta.url)))
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const terrainData = buildTerrainData({ data: image.data, width: image.info.width, height: image.info.height });
configureTerrainWorld(terrainData);

test('West March connects its eastern landing across each bridge and excludes the forest perimeter',()=>{
  const data=buildWestMarch(), nav=new TerrainMovement(data);
  assert.ok(nav.canStand(FIELD_PORTAL));
  for(const {x,z,axis} of FIELD_CROSSINGS){
    const dx=axis==='x'?22:0, dz=axis==='z'?22:0;
    assert.ok(nav.clearLine({x:x-dx,z:z-dz},{x:x+dx,z:z+dz}));
    assert.ok(nav.moveTo({x,z}));
    assert.ok(fortificationSurface(data,x,z)>0);
  }
  assert.ok(nav.moveTo({x:-202,z:29}));
  assert.equal(nav.canStand({x:143,z:95}),false);
  for(const sign of [-1,1]) for(let t=-240;t<=240;t+=5){
    assert.equal(nav.canStand({x:sign*(FIELD_LIMIT+1),z:t}),false);
    assert.equal(nav.canStand({x:t,z:sign*(FIELD_LIMIT+1)}),false);
  }
});

test('raised inland foundation stays level and only castle pads and stone approaches alter dry banks', () => {
  let city = 0, outskirts = 0, bank = 0, shoulder = 0;
  const step = TERRAIN.size / TERRAIN.segments;
  for (let i = 0; i < terrainData.heights.length; i++) {
    const x = i % terrainData.side * step - 250, z = Math.floor(i / terrainData.side) * step - 250;
    const d = terrainData.shoreDistance[i], h = terrainData.heights[i];
    assert.ok(Number.isFinite(h));
    if (d >= TERRAIN.plateauFull) {
      assert.ok(Math.abs(h - (TERRAIN.landLevel + 1.4)) < 1e-6);
      if (Math.max(Math.abs(x), Math.abs(z)) < 140) city++; else outskirts++;
    } else if (d <= TERRAIN.plateauStart) {
      const original = TERRAIN.bedLevel + (TERRAIN.landLevel - TERRAIN.bedLevel) * smoothstep(-5.5, 4.5, d)
        + groundVariation(x, z) * (1 + smoothstep(150, 235, Math.max(Math.abs(x), Math.abs(z))) * 2.2) * smoothstep(4, 15, d);
      if(Math.abs(h-original)>=2e-6){
        const castle=createCityLayout(terrainData).buildings.find(b=>b.model==='castle-red-spires');
        if(d>=0&&Math.abs(x-castle.x)<castle.halfWidth+3&&Math.abs(z-castle.z)<castle.halfDepth+10){assert.ok(h<=4.900001);bank++;continue;}
        assert.ok(d>=0&&h<=original,'Water and raised bank heights must not change outside paving cuts');
        assert.ok(createFortifications(terrainData).bridges.some(b=>{
          const along=x*b.outward.x+z*b.outward.z,across=Math.abs(x*b.tangent.x+z*b.tangent.z);
          return along>=b.from&&along<=b.to&&!(along>b.start&&along<b.end)&&across<=b.halfWidth+1;
        }));
      }
      bank++;
    } else shoulder++;
  }
  assert.ok(city > 10000 && outskirts > 1000 && bank > 1000 && shoulder > 1000);
});

// Exercise room handlers and simulation with the clock/transport boundary stubbed.
test('owner groves repeat deterministically, keep dry roots and block trunks without sealing the city', () => {
  const trees = createTreePlacements(terrainData);
  const rebuilt = buildTerrainData({ data: image.data, width: image.info.width, height: image.info.height });
  assert.deepEqual(createTreePlacements(rebuilt), trees);
  assert.equal(trees.length, 650); assert.equal(new Set(trees.map(t => t.model)).size, 3);
  assert.equal(trees.filter(t => t.region === 'outer-bank').length, 450);
  assert.ok(new Set(trees.map(t => t.yaw.toFixed(3))).size > 250);
  for (const tree of trees) {
    assert.equal(isTreeCellClear(terrainData, tree.x, tree.z, 0, .65), false);
    // Enlarged trunks must also be found across a spatial-bucket boundary.
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      assert.equal(isTreeCellClear(terrainData, tree.x + Math.cos(angle) * (tree.radius + .4),
        tree.z + Math.sin(angle) * (tree.radius + .4), 0, .65), false);
    }
    const i = Math.round((tree.z + 250) / 500 * 384) * terrainData.side + Math.round((tree.x + 250) / 500 * 384);
    assert.ok(terrainData.shoreDistance[i] >= 7.5);
    if (tree.region === 'city-ring') assert.ok(terrainData.shoreDistance[i] >= 14 && terrainData.shoreDistance[i] <= 50);
  }
  const movement = new TerrainMovement(terrainData);
  const tree = trees.find(t => t.region === 'city-ring' && movement.canStand({ x: t.x - 5, z: t.z }) && movement.canStand({ x: t.x + 5, z: t.z }));
  assert.ok(tree); movement.position = { x: tree.x - 5, z: tree.z };
  assert.ok(movement.moveTo({ x: tree.x + 5, z: tree.z }));
  for (let i = 0; i < 1000 && movement.moving; i++) {
    movement.update(.05); assert.ok(Math.hypot(movement.position.x - tree.x, movement.position.z - tree.z) > tree.radius + .65);
  }
  assert.equal(movement.moving, false); assert.ok(Math.abs(movement.position.x - tree.x - 5) < .001);
});

test('grove detours keep running through bends at slow and fast speeds and never cut trunks', () => {
  const movement = new TerrainMovement(terrainData);
  const trees = createTreePlacements(terrainData).filter(t => t.region === 'city-ring'
    && movement.canStand({ x: t.x - 6, z: t.z }) && movement.canStand({ x: t.x + 6, z: t.z })).slice(0, 24);
  assert.equal(trees.length, 24);
  for (const tree of trees) for (const level of [1, 10]) for (const direction of [-1, 1]) {
    movement.stop(); movement.position = { x: tree.x - 6 * direction, z: tree.z };
    movement.setSpeedLevel(level);
    const target = { x: tree.x + 6 * direction, z: tree.z };
    assert.ok(movement.moveTo(target));
    const path = JSON.parse(movement.path), points = [{ ...movement.position }, ...path];
    assert.ok(path.length > 1);
    for (let i = 1; i < points.length; i++) assert.ok(movement.clearLine(points[i - 1], points[i]));
    let running = false;
    for (let tick = 0; tick < 2000 && movement.moving; tick++) {
      const before = { ...movement.position }, heading = movement.heading;
      movement.update(.01);
      const distance = Math.hypot(before.x - movement.position.x, before.z - movement.position.z);
      assert.ok(Math.abs(angleDifference(heading, movement.heading)) <= TURN_SPEED * .01 + 1e-8);
      if (running && movement.moving) {
        assert.equal(movement.turning, false, 'route bends must not restart idle/turn-in-place');
        assert.ok(distance > WALK_SPEED * speedMultiplier(level) * .01 * .85, 'no stop-start at waypoints');
      }
      if (distance > .001) running = true;
      assert.ok(movement.canStand(movement.position));
      for (const trunk of trees) assert.ok(Math.hypot(movement.position.x-trunk.x, movement.position.z-trunk.z) > trunk.radius+PLAYER_RADIUS);
    }
    assert.equal(movement.moving, false); assert.deepEqual(movement.position, target);
  }
});

test('authoritative path snapshots resume the same corridor and turn phase without replanning', () => {
  const server = new TerrainMovement(terrainData), client = new TerrainMovement(terrainData);
  const tree = createTreePlacements(terrainData).find(t => t.region === 'city-ring'
    && server.canStand({ x: t.x-6, z: t.z }) && server.canStand({ x: t.x+6, z: t.z }));
  server.position = { x: tree.x-6, z: tree.z }; server.setSpeedLevel(10);
  server.moveTo({ x: tree.x+6, z: tree.z });
  client.moveTo = () => { throw new Error('snapshot must not replan'); };
  const original = server.path;
  for (let tick = 0; tick < 100 && server.moving; tick++) {
    Object.assign(client.position, server.position); client.heading = server.heading;
    client.setSpeedLevel(server.speedLevel); client.restorePath(server.path, server.next, server.turning);
    server.update(.05);
    for (let frame = 0; frame < 5; frame++) client.update(.01);
    assert.equal(server.path, original);
    assert.ok(Math.hypot(client.position.x-server.position.x, client.position.z-server.position.z) < 1e-8);
    assert.ok(Math.abs(angleDifference(client.heading,server.heading)) < 1e-8);
    assert.equal(client.turning, server.turning);
  }
  assert.equal(server.moving, false); assert.equal(client.moving, false);
});

function createRoom(roomName='mythraven-world',ready=true) {
  const handlers = new Map();
  const room = { roomName,events:[],broadcast(name,data){this.events.push({name,data});},setState(state) { this.state = state; }, setPatchRate() {}, setSimulationInterval() {},
    onMessage(name, handler) { handlers.set(name, handler); } };
  for (const name of Object.getOwnPropertyNames(TerrainRoom.prototype)) if (name !== 'constructor') room[name] = TerrainRoom.prototype[name];
  room.onCreate();
  const client = id => ({ sessionId: id, errors: [], messages:[],send(message,data) { this.errors.push(message);this.messages.push({message,data}); } });
  const a = client('a'), b = client('b'); room.onJoin(a, { displayName: 'Alice', characterId: 'novice-male-01' }); room.onJoin(b, { displayName: 'Bob', characterId: 'novice-male-02' });
  if(ready)for(const p of room.state.players.values()){p.sceneReady=true;p.protectedUntil=0;}
  return { room, a, b, send: (client, message) => { handlers.get('move')(client, message); room.tick(0); }, handlers };
}
test('city arrivals spawn on the plaza in front of the fountain, separately and on walkable ground',()=>{
  const {room,a,b}=createRoom();
  const fountain=createCityLayout(terrainData).buildings.find(building=>building.model==='plaza-angel-fountain');
  for(const client of [a,b]){
    const p=room.state.players.get(client.sessionId),nav=room.movers.get(client.sessionId);
    assert.ok(nav.canStand(p));assert.ok(Math.abs(p.x)<6);
    assert.ok(p.z>fountain.radius && p.z<fountain.radius+12);
  }
  const pa=room.state.players.get('a'),pb=room.state.players.get('b');
  assert.ok(Math.hypot(pa.x-pb.x,pa.z-pb.z)>2);
});

test('loading players cannot move, attack or be targeted; readiness grants exactly 15 seconds once',()=>{
  const {room,a,handlers}=createRoom('mythraven-west-march',false);
  const player=room.state.players.get('a'),before={...room.movers.get('a').position};
  handlers.get('weapon')(a,'dagger');
  handlers.get('move')(a,{x:190,z:28,seq:1});room.tick(50);
  handlers.get('fight')(a,'rabbit-0');
  handlers.get('auto-hunt')(a,{enabled:true,radius:null,kinds:['rabbit']});
  assert.deepEqual(room.movers.get('a').position,before);
  assert.equal(room.fighters.get('a').target,'');assert.equal(player.autoHunt,false);
  assert.equal(room.canTargetPlayer('a',9999999999),false);
  assert.equal(player.protectedUntil,0);
  room.markSceneReady('a',100);
  assert.equal(player.protectedUntil,115);
  assert.equal(room.canTargetPlayer('a',114.999),false);
  assert.equal(room.canTargetPlayer('a',115),true);
  room.markSceneReady('a',200);
  assert.equal(player.protectedUntil,115,'repeated ready messages cannot renew protection');
  handlers.get('scene-ready')(a);
  assert.equal(player.protectedUntil,115);
  assert.equal(a.messages.at(-1).message,'scene-ready');
});

test('arrival protection prevents retaliation acquisition and cancels a pending hit',async t=>{
  const {room,a,b,handlers,key,now,mob,health}=await claimFixture(t);
  const player=room.state.players.get('a');
  player.protectedUntil=now+15;
  handlers.get('fight')(a,key);room.combatTick(now);room.combatTick(now+.3);
  assert.ok(health.hp<100);assert.equal(health.engaged,false);
  // A stale target or queued hit must also pass the server protection gate.
  mob.mover=new TerrainMovement(room.terrainData);mob.victim='a';mob.impactAt=now+.4;
  health.engaged=true;health.x=player.x;health.z=player.z;
  room.retaliate(now+.5);
  assert.equal(player.hp,100);assert.equal(health.engaged,false);assert.equal(mob.victim,'');assert.equal(mob.impactAt,0);
  assert.equal(room.events.filter(e=>e.name==='combat-hit'&&e.data.to==='player').length,0);
  // A different, ready player is independently targetable.
  assert.equal(room.canTargetPlayer(b.sessionId,now),true);
});

test('server auto hunting travels, kills and retargets without client frames or follow-up commands',async t=>{
  const {room,a,b,handlers}=createRoom('mythraven-west-march');
  let now=2000;t.mock.method(Date,'now',()=>now*1000);t.mock.method(Math,'random',()=>.5);
  const place=(client,kind)=>{
    const route=[...room.patrols.values()].find(mob=>mob.route.kind===kind).route;
    const point=route.spawn,nav=room.movers.get(client.sessionId);
    Object.assign(nav.position,point);room.sync(client.sessionId);
    handlers.get('weapon')(client,'dagger');
    room.setBuild(client.sessionId,{level:100,stats:{STR:101,AGI:99,DEX:1,INT:1,VIT:100,LUK:1}});
    handlers.get('auto-hunt')(client,{enabled:true,radius:null,kinds:[kind]});
  };
  place(a,'rabbit');place(b,'wolf');
  const initial={...room.movers.get('a').position};
  for(let i=0;i<800;i++){now+=.05;room.tick(50);}
  for(const [id,kind] of [['a','rabbit'],['b','wolf']]){
    const kills=room.events.filter(event=>event.name==='combat-hit' && event.data.player===id && event.data.to==='monster' && event.data.lethal);
    assert.ok(kills.length>=2,`${id} must keep killing while no browser sends inputs`);
    assert.ok(new Set(kills.map(event=>event.data.mob)).size>=2,'must select another monster');
    assert.ok(kills.every(event=>event.data.mob.startsWith(kind+'-')));
    assert.equal(room.state.players.get(id).autoHunt,true);
  }
  assert.ok(Math.hypot(room.state.players.get('a').x-initial.x,room.state.players.get('a').z-initial.z)>1);
  handlers.get('auto-hunt')(a,{enabled:false});
  assert.equal(room.state.players.get('a').autoHunt,false);
  assert.equal(room.movers.get('a').moving,false);
  assert.equal(room.state.players.get('b').autoHunt,true);
  handlers.get('weapon')(b,'');
  assert.equal(room.state.players.get('b').autoHunt,false);
});

test('server hunt preserves a pinned radius and rejects invalid settings or unarmed starts',async t=>{
  const {room,a,handlers}=createRoom('mythraven-west-march');
  let now=2000;t.mock.method(Date,'now',()=>now*1000);
  handlers.get('auto-hunt')(a,{enabled:true,radius:null,kinds:['wolf']});
  assert.equal(room.state.players.get('a').autoHunt,false);
  handlers.get('weapon')(a,'dagger');
  for(const radius of [-1,NaN,500,'all'])handlers.get('auto-hunt')(a,{enabled:true,radius,kinds:['wolf']});
  assert.equal(room.state.players.get('a').autoHunt,false);
  const nav=room.movers.get('a'),f=room.fighters.get('a');
  Object.assign(nav.position,room.patrols.get('rabbit-0').route.spawn);room.sync('a');
  room.setBuild('a',{level:100,stats:{STR:101,AGI:99,DEX:1,INT:1,VIT:100,LUK:1}});
  handlers.get('auto-hunt')(a,{enabled:true,radius:10,kinds:['rabbit']});
  const anchor={...f.hunt.anchor};
  for(let i=0;i<200;i++){
    now+=.05;room.tick(50);
    assert.ok(Math.hypot(nav.position.x-anchor.x,nav.position.z-anchor.z)<=10.001);
  }
  handlers.get('auto-hunt')(a,{enabled:true,radius:20,kinds:['wolf']});
  assert.deepEqual(f.hunt.anchor,anchor);
});
for(const [agi,hits] of [[1,5],[99,75],[198,146],[1021,733]])test(`AGI ${agi} lands ${hits} hits in five seconds across uneven simulation ticks`,async(t)=>{
  const {room,a,handlers}=createRoom('mythraven-west-march');
  const id='rabbit-0',mob=room.state.monsters.get(id),route=room.patrols.get(id).route;
  const time=2000; // Already in range and facing a resting target.
  t.mock.method(Math,'random',()=>.07);
  handlers.get('weapon')(a,'dagger');
  room.setBuild('a',{level:205,stats:{...room.fighters.get('a').stats,AGI:agi}});
  handlers.get('fight')(a,id);
  mob.hp=10000;
  Object.assign(room.movers.get('a').position,route.spawn);room.sync('a');
  room.combatTick(time);
  for(let i=0;i<50;i++){
    room.combatTick(time+i*.1+.035);
    room.combatTick(time+(i+1)*.1);
  }
  assert.equal(room.events.filter(e=>e.data?.to==='monster').length,hits);
  assert.equal(mob.hp,10000-6*hits);
  if(agi>1)assert.ok(room.events.some(e=>e.data?.to==='player' && e.data.dodged && e.data.damage===0));
  handlers.get('fight')(a,'');
  room.combatTick(time+20);
  assert.equal(mob.hp,10000-6*hits);
});

test('a turned-away opener and an AGI change use the current swing clock immediately',async(t)=>{
  const {room,a,handlers}=createRoom('mythraven-west-march');
  t.mock.method(Math,'random',()=>.9);
  const id='rabbit-0',route=room.patrols.get(id).route,time=2000;
  const target=route.spawn,mover=room.movers.get('a'),fighter=room.fighters.get('a');
  Object.assign(mover.position,{x:target.x,z:target.z+1});mover.heading=0;room.sync('a');
  handlers.get('weapon')(a,'dagger');handlers.get('fight')(a,id);
  room.combatTick(time);
  assert.equal(room.state.players.get('a').swing,1);
  room.setBuild('a',{level:21,stats:{...fighter.stats,AGI:99}});
  const hits=()=>room.events.filter(e=>e.data?.to==='monster').length;
  for(let frame=1;frame<=60;frame++){
    room.combatTick(time+frame/60,1/60);
    if(frame===2)assert.equal(hits(),0);
    if(frame===3)assert.equal(hits(),1);
  }
  assert.equal(hits(),15);
});

async function claimFixture(t){
  const fixture=createRoom('mythraven-west-march'),{room,a,b,handlers}=fixture;
  t.mock.method(Math,'random',()=>.9);
  const key='rabbit-0',mob=room.patrols.get(key),health=room.state.monsters.get(key),now=2000;
  for(const client of [a,b]){
    Object.assign(room.movers.get(client.sessionId).position,mob.route.spawn);room.sync(client.sessionId);
    handlers.get('weapon')(client,'dagger');
  }
  return {...fixture,key,mob,health,now};
}

test('late attackers are denied manually and auto hunting skips another active fight',async t=>{
  const {room,a,b,handlers,key,now,health}=await claimFixture(t);
  handlers.get('fight')(a,key);room.combatTick(now);room.combatTick(now+.3);
  handlers.get('fight')(b,key);room.combatTick(now+.5);
  assert.equal(room.state.players.get('b').swing,0);
  assert.equal(room.fighters.get('b').target,'');
  assert.equal(health.hp,94);
  assert.ok(b.messages.some(event=>event.message==='combat-blocked' && event.data.mob===key));
  handlers.get('auto-hunt')(b,{enabled:true,radius:null,kinds:['rabbit']});
  room.huntTick(now+.6);
  assert.notEqual(room.fighters.get('b').target,key);
  assert.ok(room.fighters.get('b').target,'auto hunt must find another eligible rabbit');
});

test('near-simultaneous attackers remain eligible and share a conserved damage-weighted EXP pool',async t=>{
  const {room,a,b,handlers,key,now,health,mob}=await claimFixture(t);
  room.setBuild('a',{level:10,stats:{STR:14,AGI:1,DEX:1,INT:1,VIT:1,LUK:1}});
  room.setBuild('b',{level:10,stats:{STR:7,AGI:1,DEX:1,INT:1,VIT:1,LUK:1}});
  handlers.get('fight')(a,key);room.combatTick(now);
  handlers.get('fight')(b,key);room.combatTick(now+.1);
  room.combatTick(now+.3);room.combatTick(now+.4);
  assert.equal(health.hp,50);
  assert.equal(room.canAttack('b',key,now+.8),true);
  room.combatTick(now+1);room.combatTick(now+1.1);room.combatTick(now+1.3);room.combatTick(now+1.4);
  assert.equal(health.hp,0);
  assert.deepEqual([...mob.damage.values()],[64,36]);
  const rewards=[a,b].map(client=>client.messages.filter(event=>event.message==='combat-reward'));
  assert.deepEqual(rewards.map(list=>list.map(event=>event.data.amount)),[[22],[13]]);
  assert.equal(rewards.flat().reduce((sum,event)=>sum+event.data.amount,0),35);
  room.combatTick(now+2);assert.equal(a.messages.filter(event=>event.message==='combat-reward').length,1);
  room.combatTick(now+6.5);
  assert.equal(health.hp,100);assert.equal(mob.damage,undefined);assert.equal(mob.claim,undefined);assert.equal(mob.defenders,undefined);
});

for(const release of ['stop','death','disconnect'])test(`a wounded abandoned monster is available after ${release}, with previous damage retained`,async t=>{
  const {room,a,b,handlers,key,now,mob,health}=await claimFixture(t);
  handlers.get('fight')(a,key);room.combatTick(now);room.combatTick(now+.3);
  if(release==='stop')handlers.get('fight')(a,'');
  if(release==='death'){room.state.players.get('a').hp=0;room.fighters.get('a').reviveAt=Infinity;}
  if(release==='disconnect')room.onLeave(a);
  assert.equal(room.canAttack('b',key,now+.6),true);
  // A finishing blow must receive credit for 94 HP, not its nominal 1000 damage.
  room.setBuild('b',{level:101,stats:{STR:498,AGI:1,DEX:1,INT:1,VIT:1,LUK:1}});
  handlers.get('fight')(b,key);room.combatTick(now+.6);room.combatTick(now+.91);
  assert.equal(health.hp,0);assert.equal(mob.damage.get('a'),6);assert.equal(mob.damage.get('b'),94);
  assert.equal(room.events.at(-1).data.damage,1000);
  assert.equal(b.messages.find(event=>event.message==='combat-reward').data.amount,33);
  if(release!=='disconnect')assert.equal(a.messages.find(event=>event.message==='combat-reward').data.amount,2);
});

test('a monster damaging a bystander grants self-defense priority over an existing claim',async t=>{
  const {room,a,b,handlers,key,now,mob}=await claimFixture(t);
  handlers.get('fight')(a,key);room.combatTick(now);room.combatTick(now+.3);
  assert.equal(room.canAttack('b',key,now+.8),false);
  mob.victim='b';mob.nextCounter=now+.8;
  room.retaliate(now+.8);room.retaliate(now+1.45);
  assert.ok(room.state.players.get('b').hp<100);
  assert.equal(room.canAttack('b',key,now+1.46),true);
  handlers.get('fight')(b,key);room.combatTick(now+1.46);
  assert.ok(room.state.players.get('b').swing>0);
});

test('frontier damage requires range, respects cooldown, and a shared kill rewards only once',async(t)=>{
  const {room,a,b,handlers}=createRoom('mythraven-west-march');
  const id='rabbit-0',mob=room.state.monsters.get(id),route=room.patrols.get(id).route;
  const align=(client,time)=>{
    Object.assign(room.movers.get(client.sessionId).position,{x:mob.x,z:mob.z});
    room.sync(client.sessionId);
  };
  const time=2000;
  const roll=t.mock.method(Math,'random',()=>.9);
  handlers.get('weapon')(a,'dagger');handlers.get('weapon')(b,'dagger');
  handlers.get('fight')(a,id);
  Object.assign(room.movers.get('a').position,{x:-190,z:120});room.sync('a');
  room.combatTick(time);
  assert.equal(mob.hp,100);
  align(a,time);room.combatTick(time);
  assert.equal(mob.hp,100);assert.equal(room.state.players.get('a').swing,1);
  room.combatTick(time+.28);assert.equal(mob.hp,100);
  align(a,time+.30);room.combatTick(time+.30);const hitHp=mob.hp;
  assert.equal(hitHp,94);assert.equal(room.state.players.get('a').hp,100);
  assert.equal(room.events.at(-1).data.damage,6);
  assert.equal(room.events.at(-1).data.to,'monster');
  room.fighters.get('a').nextHit=time+4;
  room.combatTick(time+2.01);assert.equal(room.state.players.get('a').hp,100);
  room.combatTick(time+2.66);
  assert.ok(room.state.players.get('a').hp<100);
  assert.equal(room.events.at(-1).data.to,'player');
  handlers.get('fight')(a,id);room.combatTick(time+2.7);assert.equal(mob.hp,hitHp);
  mob.hp=1;
  room.setBuild('a',{level:12,stats:room.fighters.get('a').stats});
  for(const client of [a,b]){
    Object.assign(room.movers.get(client.sessionId).position,{x:mob.x,z:mob.z});room.sync(client.sessionId);
    handlers.get('fight')(client,id);
  }
  room.combatTick(time+4);room.combatTick(time+4.31);assert.equal(mob.hp,0);
  assert.equal(room.events.at(-1).data.damage,6);
  assert.equal(a.errors.filter(e=>e==='combat-reward').length,1);
  assert.equal(b.errors.includes('combat-reward'),false);
  room.combatTick(time+9.30);assert.equal(mob.hp,0);
  room.combatTick(time+9.32);assert.equal(mob.hp,100);
  assert.equal(room.fighters.get('b').target,'');
  align(b,time+22);room.state.players.get('b').hp=1;
  roll.mock.mockImplementation(()=>0);
  handlers.get('fight')(b,id);room.combatTick(time+22);
  align(b,time+22.31);room.combatTick(time+22.31);
  assert.equal(room.events.at(-1).data.damage,9);
  assert.equal(room.events.at(-1).data.critical,true);
  room.combatTick(time+24.02);room.combatTick(time+24.67);assert.equal(room.state.players.get('b').hp,0);
  assert.ok(room.events.at(-1).data.damage>1);
  room.combatTick(time+27.68);assert.equal(room.state.players.get('b').hp,100);
  assert.equal(room.state.players.get('b').x,room.movers.get('b').spawn.x);
});

test('attacking requires an equipped weapon through the impact frame',async()=>{
  const {room,a,handlers}=createRoom('mythraven-west-march');
  const id='rabbit-0',fighter=room.fighters.get('a'),p=room.state.players.get('a');
  Object.assign(room.movers.get('a').position,room.patrols.get(id).route.spawn);room.sync('a');
  handlers.get('fight')(a,id);room.combatTick(2000);
  assert.equal(fighter.target,'');assert.equal(p.swing,0);
  handlers.get('weapon')(a,'dagger');handlers.get('fight')(a,id);room.combatTick(2000);
  assert.equal(p.swing,1);
  handlers.get('weapon')(a,'');handlers.get('fight')(a,id);room.combatTick(2000.31);
  assert.equal(room.state.monsters.get(id).hp,100);assert.equal(fighter.target,'');
  handlers.get('weapon')(a,'dagger');room.combatTick(2002);
  assert.equal(p.swing,1);
});

test('combat closes to the inner range once and holds through small target steps',async()=>{
  const {weaponRange}=await import('../shared/battle-stats.mjs');
  for(const [characterId,weapon] of [['novice-male-01','dagger'],['archer-male-01','bow']]){
    const {room,handlers}=createRoom('mythraven-west-march');
    const client={sessionId:'hunter',send(){}};
    room.onJoin(client,{characterId,weapon});
    room.state.players.get('hunter').sceneReady=true;
    const mover=room.movers.get('hunter'),player=room.state.players.get('hunter');
    const range=weaponRange(weapon),id='rabbit-0',route=room.patrols.get(id).route;
    const time=2000,target=route.spawn;
    // Find a clear approach to this real patrol point.
    let angle;
    for(let i=0;i<32;i++){
      const a=i*Math.PI/16,d=range.reach+1;
      if(mover.clearLine(target,{x:target.x+d*Math.sin(a),z:target.z+d*Math.cos(a)})){angle=a;break;}
    }
    assert.notEqual(angle,undefined);
    function standAt(gap){
      Object.assign(mover.position,{x:target.x+gap*Math.sin(angle),z:target.z+gap*Math.cos(angle)});
      mover.heading=Math.atan2(target.x-mover.position.x,target.z-mover.position.z);
      room.sync('hunter');
    }
    standAt(range.reach-.1);
    mover.moveTo(target);handlers.get('fight')(client,id);
    room.combatTick(time);
    assert.equal(mover.moving,true,'finish the approach before starting the first swing');
    standAt(range.settle-.1);
    room.combatTick(time);
    assert.equal(mover.moving,false);assert.equal(player.swing,1);
    standAt(range.reach-.1);
    room.combatTick(time+.31);
    if(weapon==='bow'){assert.equal(room.state.monsters.get(id).hp,100);room.combatTick(time+.42);}
    assert.ok(room.state.monsters.get(id).hp<100,'the wind-up still lands inside weapon reach');
  }
});

test('terrain server chooses separated safe spawns and owns movement speed and identity', () => {
  const { room, a, b, send, handlers } = createRoom();
  assert.equal(room.state.players.get(a.sessionId).speedLevel, 5);
  assert.equal(room.movers.get(a.sessionId).speedLevel, 5);
  handlers.get('speed-level')(a, { level: 1 });
  const pa = room.state.players.get(a.sessionId), pb = room.state.players.get(b.sessionId);
  assert.ok(Math.hypot(pa.x - pb.x, pa.z - pb.z) > 2);
  // Measure straight-line speed on the open central foundation, away from groves.
  Object.assign(room.movers.get(a.sessionId).position, { x: 0, z: 40 }); room.tick(0);
  const start = { x: pa.x, z: pa.z }, other = { x: pb.x, z: pb.z };
  assert.ok(Math.hypot(pa.x - pb.x, pa.z - pb.z) > 2);
  room.movers.get(a.sessionId).heading = Math.atan2(15, -4); // Measure travel after facing the route.
  send(a, { x: pa.x + 15, z: pa.z - 4, speed: 99999, sessionId: b.sessionId, y: 500 });
  for (let i = 0; i < 20; i++) room.tick(50);
  assert.ok(Math.abs(Math.hypot(pa.x - start.x, pa.z - start.z) - 7) < .001);
  assert.deepEqual({ x: pb.x, z: pb.z }, other);
  assert.ok(pa.y > 1 && pa.y < 8);
  const before = { x: pa.x, z: pa.z }; room.tick(10000);
  assert.ok(Math.hypot(pa.x - before.x, pa.z - before.z) <= .351);
  for (let i = 0; i < 100; i++) room.tick(50);
  assert.equal(pa.moving, false);
  assert.ok(Math.abs(pa.x - (start.x + 15)) < .001);
});
test('terrain server rejects invalid destinations, coalesces bursts to the newest click and cancels queued moves on stop', () => {
  const { room, a, send, handlers } = createRoom();
  // Exercise command ordering on open ground; the enlarged grove blocks some old endpoints.
  Object.assign(room.movers.get(a.sessionId).position, { x: 0, z: 40 }); room.tick(0);
  const player = room.state.players.get(a.sessionId), start = { x: player.x, z: player.z };
  const malformed = [null, {}, { x: '10', z: 0 }, { x: NaN, z: 0 }, { x: Infinity, z: 0 }, { x: 9999, z: 0 },
    layoutToWorld(95, 490), layoutToWorld(30, 40)];
  for (const command of malformed) send(a, command);
  room.tick(50); assert.deepEqual({ x: player.x, z: player.z }, start);
  assert.equal(a.errors.length, malformed.length);
  send(a, { x: start.x + 10, z: start.z - 3 });
  const target = room.movers.get(a.sessionId).destination;
  for (let i = 0; i < 100; i++) handlers.get('move')(a, { x: start.x - 10, z: start.z });
  assert.deepEqual(room.movers.get(a.sessionId).destination, target);
  assert.equal(room.pendingCommands.size, 1);
  room.tick(0);
  assert.deepEqual(room.movers.get(a.sessionId).destination, { x: start.x - 10, z: start.z });
  handlers.get('move')(a, { x: start.x + 10, z: start.z, seq: 1000 });
  handlers.get('move')(a, { x: start.x - 20, z: start.z, seq: 999 });
  room.tick(0); assert.equal(player.inputSeq, 1000);
  assert.equal(room.movers.get(a.sessionId).destination.x, start.x + 10);
  handlers.get('move')(a, { x: start.x + 20, z: start.z, seq: 1001 });
  handlers.get('stop')(a); assert.equal(player.moving, false);
  room.tick(50); assert.equal(player.moving, false); assert.equal(room.pendingCommands.size, 0);
  room.onDrop(a); room.onLeave(a);
  assert.equal(room.state.players.has(a.sessionId), false); assert.equal(room.movers.has(a.sessionId), false);
});

test('ten speed levels span 1x to 5x, change mid-route and remain server bounded per player', () => {
  const { room, a, b, send, handlers } = createRoom();
  const mover = room.movers.get(a.sessionId), player = room.state.players.get(a.sessionId);
  Object.assign(mover.position,{x:0,z:90});room.sync(a.sessionId);
  const start = { ...mover.position }, target = { x: start.x, z: start.z - 50 };
  assert.ok(mover.clearLine(start, target));
  for (let level = 1; level <= 10; level++) {
    mover.stop(); Object.assign(mover.position, start);
    mover.heading = Math.PI; // Speed measurements exclude the separate turn phase.
    send(a, target); handlers.get('speed-level')(a, { level, sessionId: b.sessionId });
    for (let i = 0; i < 20; i++) room.tick(50);
    assert.ok(Math.abs(Math.hypot(player.x-start.x,player.z-start.z) - 7*(1+(level-1)*4/9)) < .001);
    assert.equal(player.speedLevel, level);
    assert.equal(room.state.players.get(b.sessionId).speedLevel, 5);
  }
  for (const level of [0, 11, -1, 1.5, NaN, Infinity, '10', null, undefined]) {
    handlers.get('speed-level')(a, { level }); assert.equal(player.speedLevel, 10);
  }
  handlers.get('speed-level')(a, null); assert.equal(player.speedLevel, 10);
  const before = { ...mover.position };
  handlers.get('speed-level')(a, { level: 1 });
  room.tick(50); assert.ok(Math.abs(Math.hypot(player.x-before.x,player.z-before.z)-.35)<.001);
  for(let i=0;i<300;i++) room.tick(50);
  assert.equal(player.moving,false); assert.ok(Math.abs(player.z-target.z)<.001);
});

test('removed prototype oak leaves no invisible trunk collider', () => {
  // This coordinate is now beside a bridge rail, but still has no tree collider.
  assert.equal(isTreeCellClear(terrainData,-6,133,0,.65),true);
});

test('city walls block bodies while four real gate corridors connect city, banks and castle',()=>{
  const layout=createFortifications(terrainData),m=new TerrainMovement(terrainData);m.setSpeedLevel(10);
  assert.equal(layout.gates.length,4);assert.equal(layout.bridges.length,4);
  for(const instance of layout.instances){assert.equal(instance.sx,instance.sy);assert.equal(instance.sy,instance.sz);}
  assert.equal(layout.instances.filter(p=>p.model==='city-stone-bridge').length,7);
  for(const wall of layout.walls)assert.equal(m.canStand(wall),false);
  for(const tower of layout.towers)assert.equal(m.canStand(tower),false);
  for(const b of layout.bridges){
    const gate=layout.gates.find(g=>g.id===b.id);
    assert.ok(gate.passage*2>(gate.id==='north'?5:7));assert.ok(m.canStand(gate));
    const outside={x:b.outward.x*(b.to-2),z:b.outward.z*(b.to-2)};
    Object.assign(m.position,{x:0,z:60});m.stop();
    for(const destination of [outside,{x:0,z:60}]){
      assert.ok(m.moveTo(destination));let onBridge=0,inGate=0;
      for(let tick=0;tick<3000&&m.moving;tick++){
        m.update(.01);assert.ok(isFortificationClear(terrainData,m.position.x,m.position.z,.65));
        const along=m.position.x*b.outward.x+m.position.z*b.outward.z;
        if(along>b.start+2&&along<b.end-2){onBridge++;assert.ok(Math.abs(m.height-4.9)<.001);assert.ok(fortificationSurface(terrainData,m.position.x,m.position.z)!==undefined);}
        if(Math.abs(along-gate.r)<1){inGate++;const across=m.position.x*gate.tangent.x+m.position.z*gate.tangent.z;assert.ok(Math.abs(across)<gate.passage-.65);}
      }
      assert.equal(m.moving,false);assert.ok(Math.hypot(m.position.x-destination.x,m.position.z-destination.z)<1e-6);assert.ok(onBridge>10);assert.ok(inGate>0);
    }
    const middle=(b.start+b.end)/2;
    assert.equal(m.canStand({x:b.outward.x*middle+b.tangent.x*5,z:b.outward.z*middle+b.tangent.z*5}),false);
  }
});

test('turns in place before travel, accepts redirects immediately and stops mid-turn', () => {
  const { room, a, send, handlers } = createRoom(), mover = room.movers.get(a.sessionId);
  Object.assign(mover.position, { x: 0, z: 40 }); room.tick(0);
  const player = room.state.players.get(a.sessionId), start = { ...mover.position };
  mover.heading = Math.PI / 2;
  send(a, { x: start.x - 20, z: start.z });
  assert.equal(mover.heading, Math.PI / 2); // Commands never teleport the heading.
  assert.equal(player.turning, true);
  for (let i = 0; i < 4; i++) {
    const before = mover.heading; room.tick(50);
    assert.ok(Math.abs(angleDifference(before, mover.heading)) <= TURN_SPEED * .05 + 1e-8);
    assert.deepEqual(mover.position, start);
    // Repeated same-direction clicks must not restart a turn timer.
    send(a, { x: start.x - 20, z: start.z });
  }
  room.tick(50);
  assert.ok(Math.hypot(mover.position.x-start.x,mover.position.z-start.z)<1e-8);
  assert.equal(player.turning, false);
  room.tick(50); assert.ok(mover.position.x < start.x - .9);
  const current = { ...mover.position }, heading = mover.heading;
  send(a, { x: current.x + 20, z: current.z });
  assert.equal(mover.heading, heading); assert.equal(player.turning, true);
  room.tick(50); assert.deepEqual(mover.position, current);
  const intermediate = mover.heading;
  send(a, { x: current.x, z: current.z - 10 });
  assert.equal(mover.heading, intermediate);
  assert.deepEqual(mover.destination, { x: current.x, z: current.z - 10 });
  handlers.get('stop')(a);
  room.tick(50); assert.equal(mover.heading, intermediate);
  assert.equal(player.turning, false); assert.equal(player.moving, false);
});

test('turns across angle wrap by the short arc and shares the tick budget with travel', () => {
  const { room } = createRoom();
  const mover = new TerrainMovement(room.terrainData);
  Object.assign(mover.position,{x:0,z:60});
  const start = { ...mover.position };
  mover.heading = 179 * Math.PI / 180; mover.setSpeedLevel(1);
  const desired = -179 * Math.PI / 180;
  mover.moveTo({ x: start.x + Math.sin(desired)*15, z: start.z + Math.cos(desired)*15 });
  mover.update(.05);
  assert.ok(Math.abs(angleDifference(mover.heading, desired)) < 1e-8);
  const expected = 7 * (.05 - (2*Math.PI/180) / TURN_SPEED);
  assert.ok(Math.abs(Math.hypot(mover.position.x-start.x,mover.position.z-start.z)-expected)<1e-8);
  const a = new TerrainMovement(room.terrainData), b = new TerrainMovement(room.terrainData);
  for (const m of [a,b]) m.moveTo({ x: m.position.x + 20, z: m.position.z - 15 });
  for(let i=0;i<20;i++) a.update(.05);
  for(let i=0;i<100;i++) b.update(.01);
  assert.ok(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)<1e-8);
  assert.ok(Math.abs(angleDifference(a.heading,b.heading))<1e-8);
});

test('entry requires a known character and derives appearance from the server catalog', () => {
  const { room, a, b, handlers } = createRoom();
  const pa = room.state.players.get(a.sessionId), pb = room.state.players.get(b.sessionId);
  assert.equal(pa.characterId, 'novice-male-01'); assert.equal(pa.hairStyle, 1);
  assert.equal(pb.characterId, 'novice-male-02'); assert.equal(pb.hairStyle, 2);
  for (const characterId of [undefined, null, '', 1, {}, 'warrior', 'novice-female-01']) {
    assert.throws(() => room.onJoin({ sessionId: 'invalid' }, { characterId }), /Choose a valid character/);
    assert.equal(room.state.players.has('invalid'), false);
    assert.equal(room.movers.has('invalid'), false);
  }
  room.onJoin({ sessionId: 'valid' }, { characterId: 'novice-male-02', hairStyle: 1, hairColor: '#36A2E8' });
  assert.equal(room.state.players.get('valid').hairStyle, 2);
  assert.equal(room.state.players.get('valid').hairColor, '#36a2e8');
  for (const hairStyle of [1, 2]) {
    const characterId = `warrior-male-0${hairStyle}`, sessionId = `warrior-${hairStyle}`;
    room.onJoin({ sessionId }, { characterId, hairStyle: 99, hairColor: 'rgb(0, 0, 0)' });
    assert.equal(room.state.players.get(sessionId).characterId, characterId);
    assert.equal(room.state.players.get(sessionId).hairStyle, hairStyle);
    assert.equal(room.state.players.get(sessionId).hairColor, '');
  }
  assert.equal(handlers.has('hair-style'), false);
});

test('3D building fronts are reachable, buildings block movement and the central fountain has a walkable perimeter',()=>{
  const layout=createCityLayout(terrainData),m=new TerrainMovement(terrainData);m.setSpeedLevel(10);
  assert.equal(layout.buildings.length,38);assert.equal(new Set(layout.buildings.map(b=>b.model)).size,10);
  const castle=layout.buildings.find(b=>b.model==='castle-red-spires');assert.ok(castle.z< -190&&castle.height>=50);
  for(const b of layout.buildings){
    assert.equal(m.canStand(b),false,b.id+' solid');
    const p={x:b.x+Math.sin(b.yaw)*(b.halfDepth+3),z:b.z+Math.cos(b.yaw)*(b.halfDepth+3)};
    assert.ok(m.canStand(p),b.id+' front');
    assert.ok(m.moveTo(p));for(let tick=0;tick<1200&&m.moving;tick++){m.update(.025);assert.ok(isBuildingClear(terrainData,m.position.x,m.position.z,.65));}
    assert.ok(Math.hypot(m.position.x-p.x,m.position.z-p.z)<.001,b.id+' arrival');
  }
  assert.equal(m.canStand({x:0,z:0}),false,'Solid statue base');
  const fountain=layout.buildings.find(b=>b.model==='plaza-angel-fountain');
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/12)assert.ok(m.canStand({x:Math.sin(angle)*(fountain.radius+3),z:Math.cos(angle)*(fountain.radius+3)}),'Walkable fountain perimeter');
  m.position={x:0,z:25};m.stop();assert.ok(m.moveTo({x:0,z:-25}));
  for(let i=0;i<500&&m.moving;i++){m.update(.025);assert.ok(Math.hypot(m.position.x,m.position.z)>fountain.radius+.65);}
  assert.ok(Math.hypot(m.position.x,m.position.z+25)<.001,'Detour arrives on opposite side');
  for(const t of createTreePlacements(terrainData))assert.ok(isCityPlantingClear(terrainData,t.x,t.z,2.07));
});



test('roaming pauses for 10–30 seconds, walks 5–30 metres at level 4 and can cross the forest',async()=>{
  const {nextExcursion,pathLength,roamingRandom,restDuration}=await import('./monster-roaming.mjs');
  const nav=new TerrainMovement(buildWestMarch());
  Object.assign(nav.position,{x:82,z:-100});
  const destination={x:122,z:-100};
  assert.equal(nav.clearLine(nav.position,destination),false);
  const mob={mover:nav,random:roamingRandom(73)};
  const origin={...nav.position};let travelled=0;
  for(let outing=0;outing<100 && Math.hypot(nav.position.x-destination.x,nav.position.z-destination.z)>5;outing++){
    const pause=restDuration(mob.random);assert.ok(pause>=10 && pause<=30);
    assert.equal(nextExcursion(mob,[destination]),true);
    const length=pathLength(nav.position,nav.route);assert.ok(length>=5-1e-6 && length<=30+1e-6);
    assert.equal(nav.speedLevel,4);
    for(let frame=0;nav.moving && frame<1000;frame++){
      const previous={...nav.position};nav.update(.05);
      assert.ok(nav.canStand(nav.position));assert.ok(nav.clearLine(previous,nav.position));
      travelled+=Math.hypot(nav.position.x-previous.x,nav.position.z-previous.z);
    }
    assert.equal(nav.moving,false);
  }
  assert.ok(Math.hypot(nav.position.x-destination.x,nav.position.z-destination.z)<5);
  assert.ok(travelled>Math.hypot(origin.x-destination.x,origin.z-destination.z)+20,'takes the bridge, not the river');
});

test('server roaming replicates positions, rests after arrival and resumes at the abandoned fight',()=>{
  const {room}=createRoom('mythraven-west-march');
  const id='rabbit-0',mob=room.patrols.get(id),health=room.state.monsters.get(id);
  room.patrols=new Map([[id,mob]]);
  const now=Date.now()/1000,origin={x:health.x,z:health.z};mob.waitUntil=now+20;
  room.roamTick(now+19,.05);assert.deepEqual({x:health.x,z:health.z},origin);
  let end=now+20;
  room.roamTick(end,.05);
  for(let i=0;mob.mover.moving && i<1000;i++){end+=.05;room.roamTick(end,.05);}
  assert.ok(Math.hypot(health.x-origin.x,health.z-origin.z)>1);
  assert.ok(mob.waitUntil-end>=10 && mob.waitUntil-end<=30);
  assert.equal(health.moving,false);
  const current={x:health.x,z:health.z};room.roamTick(mob.waitUntil-.01,.05);
  assert.deepEqual({x:health.x,z:health.z},current);
  health.engaged=true;mob.victim='missing';room.retaliate(end,.05);
  assert.equal(health.engaged,false);assert.deepEqual({x:health.x,z:health.z},current);
  assert.ok(mob.waitUntil-end>=10 && mob.waitUntil-end<=30);
  health.hp=0;mob.respawnAt=end+5;room.combatTick(end+5);
  assert.ok(health.hp>0);assert.ok(mob.mover.canStand(health));
  assert.equal(health.moving,false);
});


function bowFixture(t,agi=1){
  t.mock.method(Math,'random',()=>.9);
  const {room,handlers}=createRoom('mythraven-west-march');
  const client={sessionId:'archer',send(){}};room.onJoin(client,{characterId:'archer-male-01',weapon:'bow'});
  const p=room.state.players.get('archer'),nav=room.movers.get('archer'),health=room.state.monsters.get('rabbit-0');
  p.sceneReady=true;p.protectedUntil=Infinity;
  for(let n=0;n<32;n++){
    const candidate={x:health.x+8*Math.sin(n*Math.PI/16),z:health.z+8*Math.cos(n*Math.PI/16)};
    if(nav.canStand(candidate) && nav.clearLine(candidate,health)){Object.assign(nav.position,candidate);break;}
  }
  room.sync('archer');room.setBuild('archer',{level:Math.ceil((agi-1)/5)+1,stats:{STR:1,AGI:agi,DEX:1,INT:1,VIT:1,LUK:1}});
  handlers.get('fight')(client,'rabbit-0');return {room,handlers,client,p,health};
}

test('bow releases on frame six and applies damage only on arrival, retaining a released shot after unequipping',t=>{
  const {room,handlers,client,health}=bowFixture(t);const now=1000;
  room.combatTick(now);room.combatTick(now+.249);assert.equal(room.arrows.length,0);assert.equal(health.hp,100);
  room.combatTick(now+.25);assert.equal(room.arrows.length,1);assert.equal(health.hp,100);
  const shot=room.arrows[0];assert.equal(shot.releaseAt,now+.25);assert.ok(shot.impactAt>shot.releaseAt);
  room.combatTick(shot.impactAt-.001);assert.equal(health.hp,100);
  handlers.get('weapon')(client,'');handlers.get('fight')(client,'');
  health.x+=.5;room.combatTick(shot.impactAt);
  assert.equal(health.hp,93);assert.equal(room.arrows.length,0);
  const event=room.events.filter(e=>e.name==='combat-hit').at(-1).data;
  assert.equal(event.weapon,'bow');assert.equal(event.shotId,shot.id);
});

test('a bow projectile cannot damage a new life after its original target respawns',t=>{
  const {room,health}=bowFixture(t);room.combatTick(1000);room.combatTick(1000.25);
  const shot=room.arrows[0],mob=room.patrols.get('rabbit-0');
  health.hp=0;mob.respawnAt=1000.27;room.fighters.get('archer').target='';
  room.combatTick(1000.28);assert.equal(health.hp,100);
  room.combatTick(shot.impactAt);assert.equal(health.hp,100);assert.equal(room.arrows.length,0);
});

test('AGI 99 bow attacks sustain 15 releases per second with overlapping flights and unique impacts',t=>{
  const {room,health}=bowFixture(t,99);health.hp=60000;
  let maxFlying=0;
  for(let i=0;i<500;i++){room.combatTick(1000+i*.01,.01);maxFlying=Math.max(maxFlying,room.arrows.length);}
  const releases=room.events.filter(e=>e.name==='bow-shot').map(e=>e.data);
  const hits=room.events.filter(e=>e.name==='combat-hit').map(e=>e.data);
  assert.ok(releases.length>=74 && releases.length<=75);assert.ok(maxFlying>=2);
  assert.equal(hits.length,releases.filter(s=>s.impactAt<=1004.99).length);
  assert.equal(new Set(hits.map(h=>h.shotId)).size,hits.length);
  assert.equal(health.hp,60000-hits.length*7);
});


test('critical chance starts at 5%, reaches 60% at LUK 99 and caps at 100%',async()=>{
  const {deriveCombatStats}=await import('../shared/battle-stats.mjs');
  const chance=LUK=>deriveCombatStats(100,{STR:1,AGI:1,DEX:1,INT:1,VIT:1,LUK}).criticalChance;
  assert.equal(chance(1),.05);assert.ok(Math.abs(chance(99)-.60)<1e-12);
  assert.ok(chance(170)<1);assert.equal(chance(171),1);assert.equal(chance(9999),1);
  for(let luk=2;luk<=171;luk++)assert.ok(chance(luk)>chance(luk-1));
});

test('100% critical chance produces a critical bow impact even on the highest random roll',t=>{
  const {room,health}=bowFixture(t);health.hp=1000;
  t.mock.method(Math,'random',()=>.999999);
  room.setBuild('archer',{level:35,stats:{STR:1,AGI:1,DEX:1,INT:1,VIT:1,LUK:171}});
  room.combatTick(1000);room.combatTick(1000.25);
  const shot=room.arrows[0];room.combatTick(shot.impactAt);
  const hit=room.events.filter(e=>e.name==='combat-hit').at(-1).data;
  assert.equal(hit.critical,true);assert.equal(hit.weapon,'bow');
  assert.equal(health.hp,1000-hit.damage);
});

test('level gains fully restore HP and MP, while repeated builds and stat allocation preserve missing resources',()=>{
  const {room}=createRoom(),p=room.state.players.get('a');
  const stats={STR:1,AGI:1,DEX:1,INT:1,VIT:1,LUK:1};
  assert.equal(p.mp,30);assert.equal(p.maxMp,30);
  p.hp=12;p.mp=3;
  room.setBuild('a',{level:2,stats});
  assert.equal(p.hp,105);assert.equal(p.maxHp,105);assert.equal(p.mp,32);assert.equal(p.maxMp,32);
  p.hp=25;p.mp=2;
  room.setBuild('a',{level:2,stats});
  assert.equal(p.hp,25);assert.equal(p.mp,2);
  room.setBuild('a',{level:2,stats:{...stats,VIT:2,INT:2}});
  assert.equal(p.hp,33);assert.equal(p.maxHp,113);assert.equal(p.mp,7);assert.equal(p.maxMp,37);
  p.hp=0;p.mp=0;room.fighters.get('a').reviveAt=9999;
  room.setBuild('a',{level:5,stats:{...stats,VIT:2,INT:2}});
  assert.equal(p.hp,128);assert.equal(p.maxHp,128);assert.equal(p.mp,43);assert.equal(p.maxMp,43);
  assert.equal(room.fighters.get('a').reviveAt,0);
  p.hp=1;p.mp=0;
  room.setBuild('a',{level:6,stats:{...stats,LUK:1000}});
  assert.equal(p.hp,1);assert.equal(p.mp,0,'invalid builds cannot refill resources');
});
