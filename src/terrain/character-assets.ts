import type { CharacterDefinition } from '../../shared/character-catalog.mjs';
import { loadNovicePlayers } from './novice-player';
import { loadSkinnedPlayers } from './skinned-player';

export type PlayerFactory = Awaited<ReturnType<typeof loadSkinnedPlayers>>;
export type PlayerAvatar = ReturnType<PlayerFactory['create']>;
/** Session-owned cache: a preview and its world share assets, never player poses. */
export function createCharacterAssets() {
  const ready = new Map<string, PlayerFactory>();
  const pending = new Map<string, Promise<PlayerFactory>>();
  let disposed = false;
  const load = (model: string) => {
    if (model === 'novice') return loadNovicePlayers();
    if (model === 'warrior') return loadSkinnedPlayers({ model, url: '/assets/models/characters/m1-warrior1.glb',
      hairUrl: '/assets/models/characters/warrior-hair-02.glb', hairNode: 'Warrior_Hair_02',
      hairMaterial: 'model.020', idle: 'n_war_idle', run: 'n_war_run' });
    return Promise.reject(new Error(`No player loader for ${model}`));
  };
  return {
    get(character: CharacterDefinition) { return ready.get(character.model); },
    ensure(character: CharacterDefinition): Promise<PlayerFactory> {
      if (disposed) return Promise.reject(new Error('Character assets disposed'));
      const cached = ready.get(character.model); if (cached) return Promise.resolve(cached);
      const inflight = pending.get(character.model); if (inflight) return inflight;
      const request = load(character.model).then(factory => {
        if (disposed) { factory.dispose(); throw new Error('Character assets disposed'); }
        ready.set(character.model, factory); return factory;
      }).finally(() => pending.delete(character.model));
      pending.set(character.model, request); return request;
    },
    dispose() { if (disposed) return; disposed = true; ready.forEach(factory => factory.dispose()); ready.clear(); },
  };
}
export type CharacterAssets = ReturnType<typeof createCharacterAssets>;
