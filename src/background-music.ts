const tracks = {
  spring: ['spring-town', 'morning-in-bloom', 'lanterns-and-petals'],
  summer: ['breeze-by-the-fountain', 'sunlit-market', 'summer-festival'],
  autumn: ['cider-and-fiddles', 'golden-harvest', 'lantern-harvest-dance'],
  winter: ['first-snow', 'winter-lanterns', 'starlit-snowfall'],
  battle: ['edge-of-the-arena', 'clash-of-banners', 'last-stand', 'ironwood-groove', 'thunderstring-rally', 'wildfire-jamboree'],
};

const playlists = {
  town: [...tracks.spring, ...tracks.summer, ...tracks.autumn, ...tracks.winter],
  battle: tracks.battle,
};
type Playlist = keyof typeof playlists;
const volumeKey = 'mythraven.music-volume';

export function createBackgroundMusic() {
  const audio = new Audio();
  audio.preload = 'none';
  audio.volume = .25;
  try {
    const saved = localStorage.getItem(volumeKey);
    if (saved !== null && Number.isFinite(Number(saved))) audio.volume = Math.max(0, Math.min(1, Number(saved)));
  } catch { /* Use the default when storage is unavailable. */ }

  let playlist: Playlist | undefined;
  let queue: string[] = [];
  let currentTrack = '';
  let failures = 0;

  function resume() {
    if (!playlist || !audio.hasAttribute('src') || document.hidden || audio.volume === 0 || !audio.paused) return;
    // A fresh browser session may require a gesture before playback is allowed.
    void audio.play().catch(() => {});
  }

  function nextTrack() {
    if (!playlist) return;
    if (!queue.length) {
      queue = [...playlists[playlist]];
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      if (queue[queue.length - 1] === currentTrack && queue.length > 1) {
        [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
      }
    }
    currentTrack = queue.pop()!;
    audio.src = '/assets/audio/music/' + currentTrack + '.mp3';
    resume();
  }

  function clearSource() {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  audio.addEventListener('ended', nextTrack);
  audio.addEventListener('playing', () => { failures = 0; });
  audio.addEventListener('error', () => {
    if (!playlist || !audio.error) return;
    if (++failures >= playlists[playlist].length) clearSource();
    else nextTrack();
  });
  document.addEventListener('click', resume, { capture: true });
  document.addEventListener('keydown', resume, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.pause();
    else resume();
  });

  return {
    setPlaylist(next?: Playlist) {
      if (next === playlist) return;
      playlist = next;
      queue = [];
      currentTrack = '';
      failures = 0;
      if (playlist) {
        audio.pause();
        nextTrack();
      } else clearSource();
    },
    get volume() { return audio.volume; },
    setVolume(value: number) {
      audio.volume = Math.max(0, Math.min(1, value));
      try { localStorage.setItem(volumeKey, String(audio.volume)); } catch { /* Still applies to this session. */ }
      if (audio.volume === 0) audio.pause();
      else resume();
    },
  };
}
