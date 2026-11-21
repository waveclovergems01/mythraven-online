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

function createRoom() {
  const handlers = new Map();
  const room = { setState(state) { this.state = state; }, setPatchRate() {}, setSimulationInterval() {},
    onMessage(name, handler) { handlers.set(name, handler); } };
  for (const name of Object.getOwnPropertyNames(TerrainRoom.prototype)) if (name !== 'constructor') room[name] = TerrainRoom.prototype[name];
  room.onCreate();
  const client = id => ({ sessionId: id, errors: [], send(message) { this.errors.push(message); } });
  const a = client('a'), b = client('b'); room.onJoin(a, { displayName: 'Alice', characterId: 'novice-male-01' }); room.onJoin(b, { displayName: 'Bob', characterId: 'novice-male-02' });
  return { room, a, b, send: (client, message) => { handlers.get('move')(client, message); room.tick(0); }, handlers };
}
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
  const mover = new TerrainMovement(room.terrainData), start = { ...mover.position };
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
  room.onJoin({ sessionId: 'valid' }, { characterId: 'novice-male-02', hairStyle: 1 });
  assert.equal(room.state.players.get('valid').hairStyle, 2);
  for (const hairStyle of [1, 2]) {
    const characterId = `warrior-male-0${hairStyle}`, sessionId = `warrior-${hairStyle}`;
    room.onJoin({ sessionId }, { characterId, hairStyle: 99 });
    assert.equal(room.state.players.get(sessionId).characterId, characterId);
    assert.equal(room.state.players.get(sessionId).hairStyle, hairStyle);
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

