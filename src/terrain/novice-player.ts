import { loadSkinnedPlayers } from './skinned-player';
export const NOVICE_MODEL_URL = '/assets/models/characters/m1-novice.glb';
export const NOVICE_HAIR_URL = '/assets/models/characters/novice-hair-02.glb';
export async function loadNovicePlayers() {
  return loadSkinnedPlayers({ model: 'novice', url: NOVICE_MODEL_URL, hairUrl: NOVICE_HAIR_URL,
    hairNode: 'Novice_Hair_02', hairMaterial: 'model.013', idle: 'n_idle', run: 'n_run' });
}
