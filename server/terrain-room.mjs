import { Room, ServerError } from '@colyseus/core';
import { schema, t } from '@colyseus/schema';
import { TerrainMovement, DEFAULT_SPEED_LEVEL } from '../shared/terrain-movement.mjs';
import { normalizeAppearanceColor } from '../shared/appearance-color.mjs';
import { characterById } from '../shared/character-catalog.mjs';
import characterMaster from '../shared/character-master.json' with {type:'json'};
import { buildWestMarch, cityArrival, mapPortal, PORTAL_RADIUS } from '../shared/west-march.mjs';

import monsters from '../shared/monster-master.json' with {type:'json'};
import {attackInterval,chanceToHit,deriveCombatStats,statPointBudget,swingDuration,IMPACT_FRACTION,weaponRange} from '../shared/battle-stats.mjs';
import {createPatrols} from '../shared/frontier-patrols.mjs';
import behavior from '../shared/monster-behavior.json' with {type:'json'};
import bow from '../shared/bow-projectile.json' with {type:'json'};
import {roamingRandom,restDuration,nextExcursion} from './monster-roaming.mjs';
import {nearestHuntTarget,playerApproachPoint} from '../shared/hunt-navigation.mjs';

export const TERRAIN_ROOM_CAPACITY = 64;
export const SIMULTANEOUS_ATTACK_WINDOW = .35;
export const ARRIVAL_PROTECTION_SECONDS = 15;
let worldTerrain;
let frontierTerrain;
export function configureTerrainWorld(data) { worldTerrain = data; }
const Player = schema({ name: t.string().default(''), x: t.float32().default(0), y: t.float32().default(0),
  z: t.float32().default(0), heading: t.float32().default(0), moving: t.boolean().default(false), turning: t.boolean().default(false),
  targetX: t.float32().default(0), targetZ: t.float32().default(0), speedLevel: t.uint8().default(DEFAULT_SPEED_LEVEL),
  path: t.string().default('[]'), pathIndex: t.uint16().default(0),
  inputSeq: t.uint32().default(0), hairStyle: t.uint8().default(1), hairColor: t.string().default(''), characterId: t.string().default(''), weapon:t.string().default(''),
  autoHunt:t.boolean().default(false),huntTarget:t.string().default(''),
  sceneReady:t.boolean().default(false),protectedUntil:t.float64().default(0),
  mp:t.uint32().default(30),maxMp:t.uint32().default(30),
  hp:t.uint32().default(100),maxHp:t.uint32().default(100),swing:t.uint32().default(0),hitTarget:t.string().default(''),attackInterval:t.float32().default(1),swingStartedAt:t.float64().default(0) });
const Monster=schema({hp:t.uint16().default(0),engaged:t.boolean().default(false),
  x:t.float32().default(0),z:t.float32().default(0),heading:t.float32().default(0),moving:t.boolean().default(false)});
const World = schema({ players: t.map(Player), monsters:t.map(Monster) });

/** Browsers request destinations and bounded speed levels; the server owns simulation. */
export class TerrainRoom extends Room {
  onCreate() {
    if (!worldTerrain) throw new Error('Terrain world is not configured');
    this.terrainData = this.roomName === 'mythraven-west-march' ? (frontierTerrain ??= buildWestMarch()) : worldTerrain;
    this.maxClients = TERRAIN_ROOM_CAPACITY;
    this.setState(new World()); this.movers = new Map(); this.pendingCommands = new Map();
    this.fighters=new Map();this.patrols=new Map();this.arrows=[];this.arrowSequence=0;
    if(this.terrainData.area==='west-march'){
      for(const route of createPatrols(new TerrainMovement(this.terrainData))){
        const random=roamingRandom(route.index+7301);
        this.patrols.set(route.id,{route,random,waitUntil:Date.now()/1000+restDuration(random),respawnAt:0,nextCounter:0});
        const mob=new Monster();mob.hp=monsters[route.kind].hp;mob.x=route.spawn.x;mob.z=route.spawn.z;
        this.state.monsters.set(route.id,mob);
      }
    }
    this.roamingDestinations=[...this.patrols.values()].map(mob=>mob.route.spawn);
    this.onMessage('combat-clock',(client,sent)=>{
      if(Number.isFinite(sent))client.send('combat-clock',{server:Date.now(),sent});
    });
    this.onMessage('build',(client,build)=>this.setBuild(client.sessionId,build));
    this.onMessage('scene-ready',client=>{
      this.markSceneReady(client.sessionId);
      client.send('scene-ready');
    });
    this.onMessage('auto-hunt',(client,options)=>this.setHunt(client.sessionId,options));
    this.onMessage('fight',(client,id)=>{
      const fighter=this.fighters.get(client.sessionId);
      if(!fighter)return;
      const armed=this.state.players.get(client.sessionId)?.weapon;
      const target=this.state.players.get(client.sessionId)?.sceneReady && armed && typeof id==='string' && this.state.monsters.get(id)?.hp?id:'';
      if(fighter.target!==target){fighter.impactAt=0;fighter.chaining=false;}
      fighter.target=target;
    });
    this.setPatchRate(50);
    this.setSimulationInterval(dt => this.tick(dt), this.patrols.size ? 1000/60 : 50);
    this.onMessage('move', (client, message) => {
      const mover = this.movers.get(client.sessionId); if (!mover) return;
      const player = this.state.players.get(client.sessionId);
      if(!player.hp || !player.sceneReady)return;
      const latest = this.pendingCommands.get(client.sessionId)?.seq ?? player.inputSeq;
      const seq = message?.seq ?? latest + 1;
      if (!Number.isInteger(seq) || seq <= latest || seq > 0xffffffff) return;
      if (!message || typeof message.x !== 'number' || typeof message.z !== 'number'
        || !Number.isFinite(message.x) || !Number.isFinite(message.z)) {
        client.send('move-rejected', { seq }); return;
      }
      // Keep the newest click, never discard it because an earlier click was recent.
      // Expensive pathfinding runs at most once per player per simulation tick.
      this.pendingCommands.set(client.sessionId, { x: message.x, z: message.z, seq, client });
    });
    this.onMessage('stop', (client, message) => {
      const player = this.state.players.get(client.sessionId); if (!player) return;
      const latest = this.pendingCommands.get(client.sessionId)?.seq ?? player.inputSeq;
      const seq = message?.seq ?? latest + 1;
      if (!Number.isInteger(seq) || seq <= latest || seq > 0xffffffff) return;
      this.pendingCommands.delete(client.sessionId); player.inputSeq = seq;
      this.movers.get(client.sessionId)?.stop(); this.sync(client.sessionId);
    });
    this.onMessage('speed-level', (client, message) => {
      if (this.movers.get(client.sessionId)?.setSpeedLevel(message?.level)) this.sync(client.sessionId);
    });
    this.onMessage('weapon',(client,id)=>{
      const player=this.state.players.get(client.sessionId);
      if(!player)return;
      const job=characterById(player.characterId).classId;
      if(id!=='' && !characterMaster.classes[job].weapons.includes(id))return;
      if(id===player.weapon)return;
      player.weapon=id;
      const fighter=this.fighters.get(client.sessionId);
      fighter.impactAt=0;fighter.chaining=false;
      if(!id){this.setHunt(client.sessionId,{enabled:false});fighter.target='';player.hitTarget='';}
    });
  }
  onJoin(client, options) {
    const character = characterById(options?.characterId);
    if (!character) throw new ServerError(400, 'Choose a valid character before entering the city');
    const mover = new TerrainMovement(this.terrainData);
    const arrival = !this.terrainData.area && options?.fromWest ? cityArrival(this.terrainData) : mover.spawn;
    const portal = mapPortal(this.terrainData);
    // Separated spawn points keep new arrivals visible instead of stacking capsules.
    search: for (let radius = 0; radius < 15; radius++) for (let z = -radius; z <= radius; z++) for (let x = -radius; x <= radius; x++) {
      const candidate = { x: arrival.x + x * 2.6, z: arrival.z + z * 2.6 };
      if (Math.hypot(candidate.x-portal.x,candidate.z-portal.z) > PORTAL_RADIUS + 1 && mover.canStand(candidate) && [...this.movers.values()].every(other =>
        Math.hypot(other.position.x - candidate.x, other.position.z - candidate.z) > 2)) {
        Object.assign(mover.position, candidate); break search;
      }
    }
    const player = new Player();
    player.characterId = character.id; player.hairStyle = character.hairStyle;
    player.hairColor = normalizeAppearanceColor(options?.hairColor);
    if(characterMaster.classes[character.classId].weapons.includes(options.weapon))player.weapon=options.weapon;
    // A display label is cosmetic; it grants no account identity or privileges.
    const label = typeof options?.displayName === 'string' ? options.displayName.replace(/[<>\p{C}]/gu, '').trim().slice(0, 24) : '';
    player.name = label || 'Guest-' + client.sessionId.slice(0, 6);
    this.movers.set(client.sessionId, mover); this.state.players.set(client.sessionId, player); this.sync(client.sessionId);
    this.fighters.set(client.sessionId,{client,target:'',nextHit:0,reviveAt:0,level:1,stats:characterMaster.baseStats});
    this.setBuild(client.sessionId,options.build);
  }
  setBuild(id,build){
    if(!build || !Number.isSafeInteger(build.level) || build.level<1 || build.level>10000)return;
    const stats={},fighter=this.fighters.get(id),p=this.state.players.get(id);
    if(!fighter || !p)return;
    let spent=0;
    for(const key of Object.keys(characterMaster.baseStats)){
      const n=build.stats?.[key];
      if(!Number.isSafeInteger(n) || n<characterMaster.baseStats[key] || n>characterMaster.statCap)return;
      stats[key]=n;spent+=n-characterMaster.baseStats[key];
    }
    if(spent>statPointBudget(build.level))return;
    if(p.swing && p.weapon && (stats.AGI!==fighter.stats.AGI || stats.DEX!==fighter.stats.DEX)){
      const rate=deriveCombatStats(build.level,stats,characterMaster.items[p.weapon]).attackSpeed;
      const interval=attackInterval(rate);
      fighter.nextHit=p.swingStartedAt+interval;
      if(fighter.impactAt)fighter.impactAt=p.swingStartedAt+swingDuration(interval)*(p.weapon==='bow'?bow.releaseFrame/bow.totalFrames:IMPACT_FRACTION);
      p.attackInterval=interval;
    }
    const leveledUp=build.level>fighter.level;
    fighter.stats=stats;fighter.level=build.level;
    const derived=deriveCombatStats(fighter.level,stats,characterMaster.items[p.weapon]);
    if(leveledUp){p.hp=derived.hp;p.mp=derived.mp;fighter.reviveAt=0;}
    else{
      if(p.hp>0)p.hp=Math.max(1,Math.min(derived.hp,p.hp+derived.hp-p.maxHp));
      p.mp=Math.max(0,Math.min(derived.mp,p.mp+derived.mp-p.maxMp));
    }
    p.maxHp=derived.hp;p.maxMp=derived.mp;
  }
  markSceneReady(id,now=Date.now()/1000){
    const p=this.state.players.get(id);
    if(!p || p.sceneReady)return;
    p.sceneReady=true;p.protectedUntil=now+ARRIVAL_PROTECTION_SECONDS;
  }
  canTargetPlayer(id,now){
    const p=this.state.players.get(id);
    return !!(p?.hp && p.sceneReady && now>=p.protectedUntil);
  }
  setHunt(id,options){
    const f=this.fighters.get(id),p=this.state.players.get(id),mover=this.movers.get(id);
    if(!f || !p)return;
    if(options?.enabled!==true){
      if(f.hunt){mover.stop();f.target='';f.impactAt=0;f.chaining=false;this.sync(id);}
      f.hunt=undefined;p.autoHunt=false;p.huntTarget='';return;
    }
    const radius=options.radius===null?Infinity:options.radius;
    const kinds=Array.isArray(options.kinds)?options.kinds.filter(kind=>Object.hasOwn(monsters,kind)):[];
    if(!p.sceneReady || !this.patrols.size || !p.weapon || !kinds.length || !(radius===Infinity || Number.isFinite(radius)&&radius>=10&&radius<=100))return;
    // The server pins the anchor. A client cannot relocate a running hunt via settings.
    const anchor=f.hunt?.anchor??{...mover.position};
    f.hunt={anchor,radius,kinds:new Set(kinds),nextSearch:0,nextMove:0,skipped:new Map()};
    p.autoHunt=true;
  }
  canAttack(id,key,now){
    const mob=this.patrols.get(key),health=this.state.monsters.get(key);
    if(!mob || !health?.hp || mob.respawnAt)return false;
    const claim=mob.claim;
    if(claim){
      const point=health;
      for(const [member,last] of claim.members){
        const p=this.state.players.get(member),f=this.fighters.get(member);
        if(!p?.hp || !p.weapon || f?.target!==key || now-last>Math.max(2,p.attackInterval*2) ||
          Math.hypot(p.x-point.x,p.z-point.z)>weaponRange(p.weapon).reach+3)claim.members.delete(member);
      }
      if(!claim.members.size)mob.claim=undefined;
    }
    if(!mob.claim || mob.claim.members.has(id) || mob.defenders?.has(id))return true;
    const p=this.state.players.get(id),point=health;
    return now-mob.claim.openedAt<=SIMULTANEOUS_ATTACK_WINDOW && p &&
      Math.hypot(p.x-point.x,p.z-point.z)<=weaponRange(p.weapon).reach;
  }
  claimAttack(id,key,now){
    const mob=this.patrols.get(key);
    mob.claim??={openedAt:now,members:new Map()};
    mob.claim.members.set(id,now);
  }
  rejectAttack(id,key){
    const f=this.fighters.get(id),p=this.state.players.get(id);
    f.target='';f.impactAt=0;f.chaining=false;p.hitTarget='';p.huntTarget='';
    this.movers.get(id).stop();this.sync(id);
    f.client.send('combat-blocked',{mob:key});
  }
  rewardContributors(mob,spec){
    const contributions=[...(mob.damage??[])];
    const total=contributions.reduce((sum,[,damage])=>sum+damage,0);
    if(!total)return;
    // Largest remainder keeps integer EXP conserved, including a one-HP finishing hit.
    const shares=contributions.map(([id,damage])=>{
      const exact=spec.exp*damage/total;
      return {id,damage,amount:Math.floor(exact),remainder:exact-Math.floor(exact)};
    });
    shares.sort((a,b)=>b.remainder-a.remainder || b.damage-a.damage || a.id.localeCompare(b.id));
    let remaining=spec.exp-shares.reduce((sum,share)=>sum+share.amount,0);
    for(const share of shares){
      if(remaining>0){share.amount++;remaining--;}
      if(share.amount>0)this.fighters.get(share.id)?.client.send('combat-reward',{kind:mob.route.kind,amount:share.amount});
    }
  }
  huntTick(now){
    for(const [id,f] of this.fighters){
      const hunt=f.hunt,p=this.state.players.get(id),mover=this.movers.get(id);
      if(!hunt || !p.hp || !p.weapon)continue;
      const within=point=>Math.hypot(point.x-hunt.anchor.x,point.z-hunt.anchor.z)<=hunt.radius;
      const position=key=>{const state=this.state.monsters.get(key),mob=this.patrols.get(key);
        return mob?state:undefined;};
      const valid=key=>{const mob=this.patrols.get(key);return mob && !mob.respawnAt && this.state.monsters.get(key).hp &&
        hunt.kinds.has(mob.route.kind) && within(position(key)) && (hunt.skipped.get(key)??0)<=now && this.canAttack(id,key,now);};
      const range=weaponRange(p.weapon);
      let goal=valid(f.target)?position(f.target):undefined;
      // Complete the authored stroke before redirecting to another monster.
      if(now<p.swingStartedAt+swingDuration(p.attackInterval))continue;
      const inReach=goal && Math.hypot(goal.x-p.x,goal.z-p.z)<=range.reach && mover.clearLine(p,goal);
      if(!inReach && now>=hunt.nextSearch){
        hunt.nextSearch=now+.5;
        const candidates=[];
        for(const key of this.patrols.keys())if(valid(key))candidates.push({id:key,goal:position(key)});
        const target=nearestHuntTarget(mover,candidates,range.approach,within,f.target)||'';
        if(target!==f.target){
          f.target=target;f.impactAt=0;f.chaining=false;hunt.lastGoal=undefined;hunt.nextMove=0;
          mover.stop();
        }
        goal=target?position(target):undefined;
      }
      p.huntTarget=goal?f.target:'';
      if(!goal){if(mover.moving)mover.stop();this.sync(id);continue;}
      const gap=Math.hypot(goal.x-p.x,goal.z-p.z);
      if(gap<=(mover.moving?range.settle:range.reach) && mover.clearLine(p,goal)){
        if(mover.moving)mover.stop();this.sync(id);continue;
      }
      if(now<hunt.nextMove)continue;
      if(mover.moving && hunt.lastGoal && Math.hypot(hunt.lastGoal.x-goal.x,hunt.lastGoal.z-goal.z)<Math.max(.9,Math.min(5,gap*.12)))continue;
      hunt.nextMove=now+.2;
      const end=playerApproachPoint(mover,goal,range.approach);
      const path=end && within(end)?mover.planRoute(end):undefined;
      if(path && path.every(within)){
        mover.moveTo(end);hunt.lastGoal={x:goal.x,z:goal.z};
      }else{
        hunt.skipped.set(f.target,now+5);f.target='';p.huntTarget='';mover.stop();
      }
      this.sync(id);
    }
  }
  combatTick(now,dt=.05){
    const previous=this.lastCombatTick??now;
    this.lastCombatTick=now;
    for(const [id,mob] of this.patrols){
      if(mob.respawnAt && now>=mob.respawnAt){
        this.state.monsters.get(id).hp=monsters[mob.route.kind].hp;
        mob.respawnAt=0;mob.nextCounter=0;mob.life=(mob.life??0)+1;
        const health=this.state.monsters.get(id),spawn=this.roamingDestinations[Math.floor(mob.random()*this.roamingDestinations.length)];
        health.x=spawn.x;health.z=spawn.z;health.engaged=false;health.moving=false;
        mob.mover?.stop();if(mob.mover)Object.assign(mob.mover.position,spawn);
        mob.journey=[];mob.waitUntil=now+restDuration(mob.random);
        mob.claim=undefined;mob.damage=undefined;mob.defenders=undefined;
      }
    }
    for(const [id,f] of this.fighters){
      const p=this.state.players.get(id),mover=this.movers.get(id);
      if(!p.sceneReady)continue;
      if(!p.hp){
        if(now>=f.reviveAt){
          Object.assign(mover.position,mover.spawn);p.hp=p.maxHp;this.sync(id);
        }
        continue;
      }
      const mob=this.patrols.get(f.target);
      if(!p.weapon || !mob || mob.respawnAt) {f.impactAt=0;f.chaining=false;continue;}
      if(!this.canAttack(id,f.target,now)){this.rejectAttack(id,f.target);continue;}
      const health=this.state.monsters.get(f.target);
      const pos=health;
      const range=weaponRange(p.weapon);
      const gap=Math.hypot(pos.x-p.x,pos.z-p.z);
      if(gap>range.reach || !mover.clearLine(p,pos)){f.impactAt=0;f.chaining=false;continue;}
      const stats=deriveCombatStats(f.level,f.stats,characterMaster.items[p.weapon]),spec=monsters[mob.route.kind];
      const interval=attackInterval(stats.attackSpeed),windup=swingDuration(interval)*(p.weapon==='bow'?bow.releaseFrame/bow.totalFrames:IMPACT_FRACTION);
      if(mover.moving){
        if(!f.impactAt && gap>range.settle){f.chaining=false;continue;}
        mover.stop();this.sync(id);
      }
      if(f.impactAt ? now<f.impactAt : now<f.nextHit)continue;
      if(!f.impactAt){
        const heading=gap>.01?Math.atan2(pos.x-p.x,pos.z-p.z):mover.heading;
        // Start the wind-up on contact. The renderer turns toward the target during it.
        mover.heading=heading;
        this.sync(id);
      }
      // Carry the fractional swing clock across ticks only while continuously in range.
      // One simulation tick may contain several starts and impacts.
      let eligibleFrom=f.chaining?previous:now;
      f.chaining=true;
      while(health.hp){
        if(!f.impactAt){
          const start=Math.max(eligibleFrom,f.nextHit);
          if(start>now)break;
          this.claimAttack(id,f.target,now);
          p.attackInterval=interval;p.hitTarget=f.target;p.swingStartedAt=start;p.swing++;
          f.nextHit=start+interval;
          f.impactAt=start+windup;
        }
        if(f.impactAt>now)break;
        eligibleFrom=f.impactAt;
        f.impactAt=0;
        if(p.weapon==='bow'){
          const flight=Math.max(bow.minFlightSeconds,Math.min(bow.maxFlightSeconds,gap/bow.speed));
          const shot={id:++this.arrowSequence,player:id,mob:f.target,releaseAt:eligibleFrom,impactAt:eligibleFrom+flight,
            from:{x:p.x,y:p.y+1.8,z:p.z},life:mob.life??0,stats};
          this.arrows.push(shot);
          this.broadcast('bow-shot',{id:shot.id,player:id,mob:f.target,releaseAt:shot.releaseAt,impactAt:shot.impactAt,from:shot.from});
        }else this.hitMonster(now,id,f,mob,health,pos,spec,stats);
      }
    }
    this.resolveArrows(now);
    this.retaliate(now,dt);
  }
  resolveArrows(now){
    const flying=[];
    for(const shot of this.arrows){
      if(shot.impactAt>now){flying.push(shot);continue;}
      const mob=this.patrols.get(shot.mob),health=this.state.monsters.get(shot.mob),f=this.fighters.get(shot.player);
      // Released arrows survive retargeting/unequipping, never hit a later respawn.
      if(!f || !health?.hp || mob.respawnAt || (mob.life??0)!==shot.life)continue;
      this.hitMonster(now,shot.player,{...f,target:shot.mob},mob,health,health,monsters[mob.route.kind],shot.stats,{weapon:'bow',shotId:shot.id});
    }
    this.arrows=flying;
  }
  hitMonster(now,id,f,mob,health,pos,spec,stats,projectile){
      const roll=Math.random();
      const chance=chanceToHit(stats.hit,spec.flee);
      const missed=roll>=chance;
      const critical=!missed && roll<chance*stats.criticalChance;
      const damage=missed?0:Math.round(stats.physical*(critical?stats.criticalDamage:1));
      if(damage>0){
        mob.damage??=new Map();
        mob.damage.set(id,(mob.damage.get(id)??0)+Math.min(health.hp,damage));
      }
      this.claimAttack(id,f.target,now);
      health.hp=Math.max(0,health.hp-damage);
      this.broadcast('combat-hit',{mob:f.target,player:id,to:'monster',weapon:projectile?.weapon??this.state.players.get(id).weapon,shotId:projectile?.shotId,damage,missed,critical,lethal:health.hp===0});
      if(!health.hp){
        const killed=f.target;
        mob.respawnAt=now+spec.respawnSeconds;mob.victim='';health.engaged=false;health.moving=false;
        mob.impactAt=0;
        for(const other of this.fighters.values())if(other.target===killed){other.target='';other.impactAt=0;other.chaining=false;}
        this.rewardContributors(mob,spec);
        mob.claim=undefined;
      }else if(!health.engaged && this.canTargetPlayer(id,now)){
        mob.mover??=new TerrainMovement(this.terrainData);
        mob.mover.stop();mob.mover.setSpeedLevel(behavior.speedLevel);mob.journey=[];
        mob.leashOrigin={x:pos.x,z:pos.z};
        Object.assign(mob.mover.position,{x:pos.x,z:pos.z});
        health.x=pos.x;health.z=pos.z;health.engaged=true;
        mob.victim=id;mob.repathAt=0;
        mob.nextCounter=now+spec.attackInterval;
      }
  }
  retaliate(now,dt){
    // Retaliation has its own clock and follows the first attacker into melee range.
    for(const [id,mob] of this.patrols){
      const health=this.state.monsters.get(id);
      if(!health.engaged)continue;
      const p=this.state.players.get(mob.victim),nav=mob.mover;
      const gap=p?Math.hypot(p.x-health.x,p.z-health.z):Infinity;
      const home=mob.leashOrigin??health;
      if(!this.canTargetPlayer(mob.victim,now) || gap>32 || Math.hypot(health.x-home.x,health.z-home.z)>38){
        health.engaged=false;health.moving=false;mob.victim='';mob.impactAt=0;nav.stop();mob.journey=[];mob.waitUntil=now+restDuration(mob.random);continue;
      }
      if(gap>3.6 || !nav.clearLine(nav.position,p)){
        mob.impactAt=0;
        if(now>=mob.repathAt){mob.repathAt=now+.55;nav.moveTo({x:p.x,z:p.z});}
        nav.update(dt);health.x=nav.position.x;health.z=nav.position.z;
        health.moving=nav.moving && !nav.turning;health.heading=nav.heading;continue;
      }
      nav.stop();health.moving=false;health.heading=Math.atan2(p.x-health.x,p.z-health.z);
      const spec=monsters[mob.route.kind],f=this.fighters.get(mob.victim);
      if(!mob.impactAt){
        if(now<mob.nextCounter)continue;
        this.broadcast('monster-swing',id);
        mob.impactAt=now+(mob.route.kind==='rabbit'?22:14)/24*IMPACT_FRACTION;
        mob.nextCounter=now+spec.attackInterval;
        continue;
      }
      if(now<mob.impactAt)continue;
      mob.impactAt=0;
      const stats=deriveCombatStats(f.level,f.stats,characterMaster.items[p.weapon]);
      const dodged=Math.random()<1-chanceToHit(spec.hit,stats.flee);
      const defense=spec.attackType==='magic'?stats.magicDefense:stats.defense;
      const damage=dodged?0:Math.max(1,spec.attack-defense);
      if(damage>0){mob.defenders??=new Set();mob.defenders.add(mob.victim);}
      p.hp=Math.max(0,p.hp-damage);
      this.broadcast('combat-hit',{mob:id,player:mob.victim,to:'player',damage,dodged,critical:false,lethal:p.hp===0});
      if(!p.hp){f.target='';f.reviveAt=now+3;this.movers.get(mob.victim).stop();this.sync(mob.victim);}
    }
  }
  sync(id) {
    const mover = this.movers.get(id), player = this.state.players.get(id); if (!mover || !player) return;
    player.x = mover.position.x; player.z = mover.position.z; player.y = mover.height;
    player.heading = mover.heading; player.moving = mover.moving; player.turning = mover.turning;
    player.speedLevel = mover.speedLevel;
    player.path = mover.path; player.pathIndex = mover.next;
    player.targetX = mover.destination?.x ?? mover.position.x; player.targetZ = mover.destination?.z ?? mover.position.z;
  }
  roamTick(now,dt){
    let plans=0;
    for(const [id,mob] of this.patrols){
      const health=this.state.monsters.get(id);
      if(!health.hp || health.engaged || mob.respawnAt)continue;
      if(!mob.mover?.moving){
        if(now<mob.waitUntil || plans>=2)continue;
        plans++;
        if(!mob.mover){mob.mover=new TerrainMovement(this.terrainData);Object.assign(mob.mover.position,{x:health.x,z:health.z});}
        if(!nextExcursion(mob,this.roamingDestinations)){mob.waitUntil=now+restDuration(mob.random);continue;}
      }
      mob.mover.update(dt);
      health.x=mob.mover.position.x;health.z=mob.mover.position.z;
      health.heading=mob.mover.heading;health.moving=mob.mover.moving && !mob.mover.turning;
      if(!mob.mover.moving)mob.waitUntil=now+restDuration(mob.random);
    }
  }
  tick(milliseconds) {
    for (const [id, command] of this.pendingCommands) {
      const mover = this.movers.get(id), player = this.state.players.get(id);
      if (!mover || !player) continue;
      if (!mover.moveTo({ x: command.x, z: command.z })) command.client.send('move-rejected', { seq: command.seq });
      player.inputSeq = command.seq;
    }
    this.pendingCommands.clear();
    if(this.patrols.size)this.roamTick(Date.now()/1000,Math.min(.05,Math.max(0,milliseconds/1000)));
    if(this.patrols.size)this.huntTick(Date.now()/1000);
    for (const [id, mover] of this.movers) { mover.update(Math.min(50, Math.max(0, milliseconds)) / 1000); this.sync(id); }
    if(this.patrols.size)this.combatTick(Date.now()/1000,Math.min(.1,Math.max(0,milliseconds/1000)));
  }
  onLeave(client) { this.fighters.delete(client.sessionId);this.state.players.delete(client.sessionId); this.movers.delete(client.sessionId); this.pendingCommands.delete(client.sessionId); }
  onDrop(client) { this.onLeave(client); }
  onDispose() { this.arrows=[];this.movers.clear(); this.pendingCommands.clear();this.patrols.clear();this.fighters.clear(); }
}
