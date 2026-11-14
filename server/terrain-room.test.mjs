import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { TerrainRoom, configureTerrainWorld } from './terrain-room.mjs';
import { buildTerrainData, layoutToWorld } from '../shared/terrain-data.mjs';
import { RIVERSIDE_OAK } from '../shared/terrain-props.mjs';
import { TerrainMovement, TURN_SPEED, angleDifference } from '../shared/terrain-movement.mjs';
const image = await sharp(fileURLToPath(new URL('../public/assets/maps/mythraven-land.png', import.meta.url)))
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
configureTerrainWorld(buildTerrainData({ data: image.data, width: image.info.width, height: image.info.height }));

// Exercise room handlers and simulation with the clock/transport boundary stubbed.
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
  const start = { ...mover.position }, target = { x: start.x, z: start.z - 70 };
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

test('riverside oak blocks its trunk while players can route around its canopy', () => {
  const {room,a,send}=createRoom(), mover=room.movers.get(a.sessionId);
  assert.equal(mover.canStand(RIVERSIDE_OAK),false);
  send(a,RIVERSIDE_OAK);assert.equal(a.errors.at(-1),'move-rejected');
  const start={x:RIVERSIDE_OAK.x-5,z:RIVERSIDE_OAK.z}, end={x:RIVERSIDE_OAK.x+5,z:RIVERSIDE_OAK.z};
  assert.ok(mover.canStand(start)&&mover.canStand(end));Object.assign(mover.position,start);
  send(a,end);
  for(let i=0;i<200&&mover.moving;i++) {
    room.tick(50);
    assert.ok(Math.hypot(mover.position.x-RIVERSIDE_OAK.x,mover.position.z-RIVERSIDE_OAK.z)>RIVERSIDE_OAK.radius+.65);
  }
  assert.equal(mover.moving,false);assert.ok(Math.abs(mover.position.x-end.x)<.001);
});

test('turns in place before travel, accepts redirects immediately and stops mid-turn', () => {
  const { room, a, send, handlers } = createRoom(), mover = room.movers.get(a.sessionId);
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
  send(a, { x: current.x, z: current.z - 20 });
  assert.equal(mover.heading, intermediate);
  assert.deepEqual(mover.destination, { x: current.x, z: current.z - 20 });
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
