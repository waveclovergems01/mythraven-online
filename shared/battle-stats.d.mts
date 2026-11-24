export function swingDuration(interval:number):number;
export const IMPACT_FRACTION:number;
export function attackInterval(attackSpeed:number):number;
export function weaponRange(weapon:string|null):Readonly<{approach:number;settle:number;reach:number}>;
export function deriveCombatStats(level:number,stats:Record<'STR'|'AGI'|'DEX'|'INT'|'VIT'|'LUK',number>,item?:{stat:string;attack:number}):{physical:number;magic:number;defense:number;hp:number;mp:number;attackSpeed:number;dodgeChance:number;criticalChance:number};
