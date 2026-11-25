import test from 'node:test';
import assert from 'node:assert/strict';
import {worldHour,WorldClock} from '../shared/world-time.mjs';
const midnight=Date.parse('2026-11-24T00:00:00+07:00');
test('Thai midnight starts daylight; each 90-minute half cycles continuously across days',()=>{
  for(const day of [-1,0,1,30])for(const [minutes,hour] of [[0,6],[45,12],[90,18],[135,0],[180,6],[270,18],[360,6]])
    assert.equal(worldHour(midnight+day*86400000+minutes*60000),hour);
  for(const boundary of [90,135,180]){
    const before=worldHour(midnight+boundary*60000-1),after=worldHour(midnight+boundary*60000+1);
    assert.ok(((after-before+24)%24)<.00001,'no lighting jump across cycle boundaries');
  }
});
test('restarts and late joins derive the same phase from absolute server time, not uptime',()=>{
  const stamp=midnight+105*60000;
  const a=new WorldClock(0,10),b=new WorldClock(864000000,800);
  a.sample(stamp,10,110);b.sample(stamp,800,900);
  assert.equal(worldHour(a.now(110)),worldHour(b.now(900)));
  assert.equal(a.now(3600110),stamp+50+3600000,'background elapsed time advances without frames');
});
test('server samples account for round trip and gently correct drift without local Date dependence',()=>{
  const clock=new WorldClock(midnight-36000000,0);
  assert.equal(clock.ready,false);assert.equal(clock.sample(midnight,100,200),true);
  assert.equal(clock.now(200),midnight+50);assert.equal(clock.now(1200),midnight+1050);
  const before=clock.now(2200);clock.sample(midnight+2200,2100,2200);
  assert.equal(clock.now(2200),before,'resync does not snap');
  assert.equal(clock.now(7200),midnight+7250);
  assert.equal(clock.sample(NaN,0,1),false);assert.equal(clock.sample(1,0,20000),false);
});
