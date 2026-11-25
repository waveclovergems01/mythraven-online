const storageKey = 'mythraven.audio-settings';
const defaults = {
  master: 1,
  music: .25,
  self: 1,
  others: 1,
  musicEnabled: true,
  effectsEnabled: true,
};

type Settings = typeof defaults;
export type VolumeChannel = 'master' | 'music' | 'self' | 'others';
export type EffectChannel = 'self' | 'others';
type Toggle = 'musicEnabled' | 'effectsEnabled';

function volume(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

function restore(): Settings {
  const state = {...defaults};
  try {
    const legacy = localStorage.getItem('mythraven.music-volume');
    if (legacy !== null && legacy !== '') state.music = volume(Number(legacy), state.music);
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Partial<Settings> | null;
    if (!saved) return state;
    for (const key of ['master', 'music', 'self', 'others'] as const) state[key] = volume(saved[key], state[key]);
    for (const key of ['musicEnabled', 'effectsEnabled'] as const) {
      if (typeof saved[key] === 'boolean') state[key] = saved[key];
    }
  } catch { /* Keep the defaults if storage is unavailable. */ }
  return state;
}

const state = restore();
const listeners = new Set<() => void>();
function changed() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Still applies to this session. */ }
  for (const listener of listeners) listener();
}

export const audioSettings = {
  get value(): Readonly<Settings> { return state; },
  gain(channel: Exclude<VolumeChannel, 'master'>) {
    const enabled = channel === 'music' ? state.musicEnabled : state.effectsEnabled;
    return enabled ? state.master * state[channel] : 0;
  },
  setVolume(channel: VolumeChannel, value: number) {
    state[channel] = volume(value, state[channel]);
    changed();
  },
  setEnabled(key: Toggle, enabled: boolean) {
    state[key] = enabled;
    changed();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
