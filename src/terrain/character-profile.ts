import master from '../../shared/character-master.json' with {type:'json'};
import progression from '../../shared/level-progression.json';
import {deriveCombatStats,statPointBudget} from '../../shared/battle-stats.mjs';
export function combatStats(p:Profile){return deriveCombatStats(p.level,p.stats,p.weapon?master.items[p.weapon]:undefined);}
export function expRequired(level:number){
  const table=progression.expToNextLevel;
  return table[level-1]??(table[table.length-1]+(level-table.length)*progression.additionalExpPerLevelAfterTable);
}
export type Job=keyof typeof master.classes;
export type Weapon=keyof typeof master.items;
export type Stat=keyof typeof master.baseStats;
export const stats=Object.keys(master.baseStats) as Stat[];
export type Profile={level:number; exp:number; stats:Record<Stat,number>; bag:(Weapon|null)[]; weapon:Weapon|null; bagCapacity:number; gold:number};
export type StatAllocation=Partial<Record<Stat,number>>;
export type Command={kind:'experience';amount:number}|{kind:'equip';item:Weapon;index?:number}|
  {kind:'unequip';index?:number;item?:Weapon}|{kind:'move-bag';item:Weapon;from:number;to:number}|
  {kind:'sort-bag'}|{kind:'expand-bag'}|{kind:'allocate';increases:StatAllocation}|{kind:'level'}|{kind:'reset-level'};

const inventoryItems=(bag:Profile['bag'])=>bag.filter((item):item is Weapon=>item!==null);
export const bagItemCount=(p:Profile)=>inventoryItems(p.bag).length;
const validSlot=(p:Profile,slot:number)=>Number.isInteger(slot) && slot>=0 && slot<p.bagCapacity;
const categoryOrder=master.inventory.categoryOrder;
function categoryRank(category:string){
  const rank=categoryOrder.indexOf(category);
  return rank===-1?categoryOrder.length:rank;
}
function setBagSlot(p:Profile,slot:number,item:Weapon|null){
  while(p.bag.length<=slot)p.bag.push(null);
  p.bag[slot]=item;
}

function createProfile(job:Job):Profile {
  return {level:master.startingLevel,exp:0,stats:{...master.baseStats},bag:[master.classes[job].starter as Weapon],weapon:null,bagCapacity:master.inventory.capacity,gold:0};
}
export function points(p:Profile){
  return statPointBudget(p.level)-stats.reduce((spent,s)=>spent+p.stats[s]-master.baseStats[s],0);
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
        if(!stats.includes(stat as Stat) || !Number.isSafeInteger(amount) || amount<0 ||
          amount>master.statCap-p.stats[stat as Stat])throw new Error('Invalid stat allocation');
        total+=amount;
      }
      if(total>points(p))throw new Error('Insufficient stat points');
      for(const stat of stats)p.stats[stat]+=command.increases[stat]??0;
      return;
    }
    case 'equip': {
      const at=command.index??p.bag.indexOf(command.item);
      if(p.bag[at]!==command.item || !master.classes[job].weapons.includes(command.item))return;
      p.bag[at]=p.weapon;
      p.weapon=command.item;return;
    }
    case 'unequip': {
      if(!p.weapon || (command.item!==undefined && command.item!==p.weapon))return;
      const firstEmpty=p.bag.indexOf(null);
      const slot=command.index??(firstEmpty===-1?p.bag.length:firstEmpty);
      if(!validSlot(p,slot)||p.bag[slot])return;
      setBagSlot(p,slot,p.weapon);
      p.weapon=null;
      return;
    }
    case 'move-bag': {
      const {from,to,item}=command;
      if(!validSlot(p,from)||!validSlot(p,to)||from===to||p.bag[from]!==item)return;
      const swapped=p.bag[to]??null;
      setBagSlot(p,to,item);
      p.bag[from]=swapped;
      return;
    }
    case 'sort-bag':
      p.bag=inventoryItems(p.bag).sort((a,b)=>{
        const first=master.items[a],second=master.items[b];
        return categoryRank(first.category)-categoryRank(second.category) ||
          first.sortPriority-second.sortPriority || a.localeCompare(b,'en');
      });
      return;
    case 'expand-bag':
      p.bagCapacity=Math.min(master.inventory.maxCapacity,p.bagCapacity+master.inventory.slotsPerPage);
      return;
  }
}
// Progress belongs to this page lifetime. Inventory and equipment are shared between reloads/tabs.
const sessionProgress=new Map<string,Pick<Profile,'level'|'stats'|'exp'>>();
export function openCharacterProfile(owner:string,job:Job){
  const key='mr.character.v1.'+encodeURIComponent(owner)+'.'+job;
  function read():Profile{
    try{
      const raw=localStorage.getItem(key);
      if(raw){
        const p=JSON.parse(raw) as Profile;
        const {capacity,maxCapacity,slotsPerPage}=master.inventory;
        const storedCapacity=p?.bagCapacity;
        const bagCapacity=Number.isSafeInteger(storedCapacity) && storedCapacity>capacity
          ? Math.min(maxCapacity,Math.ceil(storedCapacity/slotsPerPage)*slotsPerPage)
          : capacity;
        if(p && Array.isArray(p.bag) && p.bag.length<=bagCapacity &&
          p.bag.every(id=>id===null || typeof id==='string' && Object.hasOwn(master.items,id)) &&
          (p.weapon===null || master.classes[job].weapons.includes(p.weapon))){
          const progress=sessionProgress.get(key)??createProfile(job);
          const gold=Number.isSafeInteger(p.gold) && p.gold>=0?p.gold:0;
          return {level:progress.level,exp:progress.exp,stats:{...progress.stats},bag:p.bag,weapon:p.weapon,bagCapacity,gold};
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
        localStorage.setItem(key,JSON.stringify({bag:next.bag,weapon:next.weapon,bagCapacity:next.bagCapacity,gold:next.gold}));
        sessionProgress.set(key,{level:next.level,exp:next.exp,stats:next.stats});refresh();
      }
      if(navigator.locks)await navigator.locks.request(key,commit);else commit();
    },
    subscribe(fn:()=>void){listeners.add(fn);},
    destroy(){listeners.clear();window.removeEventListener('storage',storage);}
  };
}
export type ProfileStore=ReturnType<typeof openCharacterProfile>;

