import master from './character-master.json' with {type:'json'};
const crit=master.criticalRate;
const accuracy=master.accuracy;
export function statPointBudget(level){
  return master.startingStatPoints+(level-master.startingLevel)*master.pointsPerLevel;
}
export function chanceToHit(hit,flee){
  return Math.max(0,Math.min(1,accuracy.equalRatingChance+(hit-flee)*accuracy.chancePerRating));
}
// The three current player attack clips are ten frames at 24 FPS.
export function swingDuration(interval){return Math.min(10/24,interval*.9);}
export const IMPACT_FRACTION=.7;
export function attackInterval(attackSpeed){return 1/attackSpeed;}
// Approach a little inside weapon reach so small patrol steps do not restart a run.
const meleeRange={approach:2.6,settle:3.15,reach:4.2};
const bowRange={approach:8,settle:8.55,reach:11};
export function weaponRange(weapon){return weapon==='bow'?bowRange:meleeRange;}
export function deriveCombatStats(level,stats,item){
  const {STR,AGI,DEX,INT,VIT,LUK}=stats;
  return {physical:(item && item.stat==='DEX'?DEX:STR)*2+Math.floor(LUK/3)+(item?item.attack:0),
    magic:INT*2,defense:VIT+Math.floor(AGI/4),magicDefense:INT+Math.floor(VIT/4),hp:100+(VIT-1)*8+(level-1)*5,
    mp:30+(INT-1)*5+(level-1)*2,attackSpeed:1+(AGI-1)/7+(DEX-1)*.005,
    hit:accuracy.baseHit+(DEX-master.baseStats.DEX)*accuracy.hitPerDex,
    flee:accuracy.baseFlee+(AGI-master.baseStats.AGI)*accuracy.fleePerAgi,criticalDamage:1.5,
    criticalChance:Math.min(crit.maxChance,crit.baseChance+Math.max(0,LUK-master.baseStats.LUK)*
      (crit.referenceChance-crit.baseChance)/(crit.referenceLuck-master.baseStats.LUK))};
}
