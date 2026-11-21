import type {CharacterDefinition} from '../../shared/character-catalog.mjs';
import {createPlayerLibrary} from './player-library';
import {equipment,loadSkinnedPlayers,type PlayerClass,type Weapon} from './skinned-player';

export type PlayerFactory=Awaited<ReturnType<typeof loadSkinnedPlayers>>;
export type PlayerAvatar=ReturnType<PlayerFactory['create']>;
export function createCharacterAssets(){
  const library=createPlayerLibrary(), ready=new Map<string,PlayerFactory>(), pending=new Map<string,Promise<PlayerFactory>>();
  let disposed=false;
  return {
    get(character:CharacterDefinition){return ready.get(character.model);},
    loadWeapon(weapon:Weapon){return library.load('weapons/'+weapon);},
    ensure(character:CharacterDefinition){
      const model=character.model;
      if(disposed || !Object.hasOwn(equipment,model)) return Promise.reject(new Error('Unavailable character '+model));
      const cached=ready.get(model);if(cached) return Promise.resolve(cached);
      const inflight=pending.get(model);if(inflight) return inflight;
      const request=loadSkinnedPlayers(model as PlayerClass,library).then(factory=>{
        if(disposed){factory.dispose();throw new Error('Character assets disposed');}
        ready.set(model,factory);return factory;
      }).finally(()=>pending.delete(model));
      pending.set(model,request);return request;
    },
    dispose(){if(disposed)return;disposed=true;ready.forEach(f=>f.dispose());ready.clear();library.dispose();},
  };
}
export type CharacterAssets=ReturnType<typeof createCharacterAssets>;
