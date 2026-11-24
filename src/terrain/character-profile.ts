import master from '../../shared/character-master.json' with {type:'json'};
import progression from '../../shared/level-progression.json';
import {deriveCombatStats} from '../../shared/battle-stats.mjs';
export function combatStats(p:Profile){return deriveCombatStats(p.level,p.stats,p.weapon?master.items[p.weapon]:undefined);}
export function expRequired(level:number){
  const table=progression.expToNextLevel;
  return table[level-1]??(table[table.length-1]+(level-table.length)*progression.additionalExpPerLevelAfterTable);
}
export type Job=keyof typeof master.classes;
export type Weapon=keyof typeof master.items;
export type Stat=keyof typeof master.baseStats;
export const stats=Object.keys(master.baseStats) as Stat[];
export type Profile={level:number; exp:number; stats:Record<Stat,number>; bag:Weapon[]; weapon:Weapon|null};
export type StatAllocation=Partial<Record<Stat,number>>;
export type Command={kind:'experience';amount:number}|{kind:'equip';item:Weapon;index?:number}|{kind:'unequip'}|{kind:'allocate';increases:StatAllocation}|{kind:'level'}|{kind:'reset-level'};

function createProfile(job:Job):Profile {
  return {level:master.startingLevel,exp:0,stats:{...master.baseStats},bag:[master.classes[job].starter as Weapon],weapon:null};
}
export function points(p:Profile){
  return (p.level-master.startingLevel)*master.pointsPerLevel-stats.reduce((spent,s)=>spent+p.stats[s]-master.baseStats[s],0);
}
export function applyCommand(p:Profile,job:Job,command:Command) {
  switch(command.kind){
    case 'experience':
      if(!Number.isSafeInteger(command.amount) || command.amount<=0)return;
      p.exp+=command.amount;
      while(p.exp>=expRequired(p.level)){p.exp-=expRequired(p.level);p.level++;}
      return;
    case 'level': p.level++;return;
    case 'reset-level':
      p.level=master.startingLevel;p.exp=0;p.stats={...master.baseStats};return;
    case 'allocate': {
      let total=0;
      for(const [stat,amount] of Object.entries(command.increases)){
        if(!stats.includes(stat as Stat) || !Number.isSafeInteger(amount) || amount<0)throw new Error('Invalid stat allocation');
        total+=amount;
      }
      if(total>points(p))throw new Error('Insufficient stat points');
      for(const stat of stats)p.stats[stat]+=command.increases[stat]??0;
      return;
    }
    case 'equip': {
      const at=command.index??p.bag.indexOf(command.item);
      if(p.bag[at]!==command.item || !master.classes[job].weapons.includes(command.item))return;
      p.bag.splice(at,1);
      if(p.weapon)p.bag.push(p.weapon);
      p.weapon=command.item;return;
    }
    case 'unequip':
      if(p.weapon && p.bag.length<master.inventory.capacity){p.bag.push(p.weapon);p.weapon=null;}
      return;
  }
}
// Progress belongs to this page lifetime. Only equipment is shared between reloads/tabs.
const sessionProgress=new Map<string,Pick<Profile,'level'|'stats'|'exp'>>();
export function openCharacterProfile(owner:string,job:Job){
  const key='mr.character.v1.'+encodeURIComponent(owner)+'.'+job;
  function read():Profile{
    try{
      const raw=localStorage.getItem(key);
      if(raw){
        const p=JSON.parse(raw) as Profile;
        if(p && Array.isArray(p.bag) && p.bag.length<=master.inventory.capacity &&
          p.bag.every(id=>typeof id==='string' && Object.hasOwn(master.items,id)) &&
          (p.weapon===null || master.classes[job].weapons.includes(p.weapon))){
          const progress=sessionProgress.get(key)??createProfile(job);
          return {level:progress.level,exp:progress.exp,stats:{...progress.stats},bag:p.bag,weapon:p.weapon};
        }
      }
    }catch{ /* A missing or unreadable save still allows a fresh character. */ }
    return createProfile(job);
  }
  let current=read();
  const listeners=new Set<()=>void>();
  function refresh(){
    current=read();
    for(const fn of listeners)fn();
  }
  const storage=(event:StorageEvent)=>{if(event.key===key || event.key===null)refresh();};
  window.addEventListener('storage',storage);
  return {get value(){return current;},
    async change(command:Command){
      function commit(){
        const next=read();applyCommand(next,job,command);
        localStorage.setItem(key,JSON.stringify({bag:next.bag,weapon:next.weapon}));
        sessionProgress.set(key,{level:next.level,exp:next.exp,stats:next.stats});refresh();
      }
      if(navigator.locks)await navigator.locks.request(key,commit);else commit();
    },
    subscribe(fn:()=>void){listeners.add(fn);},
    destroy(){listeners.clear();window.removeEventListener('storage',storage);}
  };
}
export type ProfileStore=ReturnType<typeof openCharacterProfile>;

