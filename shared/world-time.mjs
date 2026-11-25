import config from './world-time.json' with {type:'json'};
export const WORLD_TIME=config;
/** Thai midnight is sunrise. Every three real hours completes one game day. */
export function worldHour(epochMs){
  const cycle=config.daySeconds+config.nightSeconds;
  const seconds=epochMs/1000+config.utcOffsetMinutes*60;
  const phase=((seconds%cycle)+cycle)%cycle;
  const elapsed=phase<config.daySeconds ? phase/config.daySeconds*12 : 12+(phase-config.daySeconds)/config.nightSeconds*12;
  return (config.sunriseHour+elapsed)%24;
}
/** Server epoch + monotonic elapsed time, independent of local wall-clock changes. */
export class WorldClock{
  ready=false;
  constructor(epochMs=Date.now(),monotonicMs=performance.now()){
    this.epoch=epochMs;this.anchor=monotonicMs;this.correction=0;
  }
  now(monotonicMs=performance.now()){
    const elapsed=Math.max(0,monotonicMs-this.anchor);
    return this.epoch+elapsed+this.correction*Math.min(1,elapsed/5000);
  }
  sample(serverMs,sentMonotonicMs,receivedMonotonicMs=performance.now()){
    const rtt=receivedMonotonicMs-sentMonotonicMs;
    if(!Number.isFinite(serverMs)||!Number.isFinite(rtt)||rtt<0||rtt>10000)return false;
    const estimated=serverMs+rtt/2,current=this.now(receivedMonotonicMs);
    this.epoch=this.ready?current:estimated;this.anchor=receivedMonotonicMs;
    this.correction=this.ready?estimated-current:0;this.ready=true;return true;
  }
}
