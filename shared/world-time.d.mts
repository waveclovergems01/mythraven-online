export const WORLD_TIME:{daySeconds:number;nightSeconds:number;utcOffsetMinutes:number;sunriseHour:number;bearing:number};
export function worldHour(epochMs:number):number;
export class WorldClock {
  ready:boolean;
  constructor(epochMs?:number,monotonicMs?:number);
  now(monotonicMs?:number):number;
  sample(serverMs:number,sentMonotonicMs:number,receivedMonotonicMs?:number):boolean;
}
