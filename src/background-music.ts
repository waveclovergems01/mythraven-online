import { audioSettings } from './audio-settings';

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

const trackSeconds = 270;
const fadeSeconds = 4;

export function createBackgroundMusic() {
  let volume = audioSettings.gain('music');

  function createDeck() {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'none';
    return {audio, gain: 0, loops: 0, lastTime: 0};
  }
  type Deck = ReturnType<typeof createDeck>;
  const decks = [createDeck(), createDeck()];
  let active: Deck | undefined;
  let incoming: Deck | undefined;
  let fade: {start: number; outgoingGain: number} | undefined;
  let frame = 0;
  let playlist: Playlist | undefined;
  let queue: string[] = [];
  let currentTrack = '';
  let failures = 0;

  function applyVolume(deck: Deck, gain: number) {
    deck.gain = gain;
    deck.audio.volume = volume * gain;
  }

  function clear(deck: Deck) {
    deck.audio.pause();
    deck.audio.removeAttribute('src');
    deck.audio.load();
  }

  function resume() {
    if (!playlist || document.hidden || volume === 0) return;
    for (const deck of decks) {
      if (deck.audio.hasAttribute('src') && deck.audio.paused && !deck.audio.ended && !deck.audio.error) {
        // A fresh browser session may require a gesture before playback is allowed.
        void deck.audio.play().catch(() => {});
      }
    }
    if (fade && !frame) frame = requestAnimationFrame(updateFade);
  }

  function pause() {
    cancelAnimationFrame(frame);
    frame = 0;
    for (const deck of decks) deck.audio.pause();
  }

  function updateFade() {
    frame = 0;
    if (!fade || !incoming || document.hidden || volume === 0) return;
    // Using the incoming playhead keeps the fade in place while paused or buffering.
    const progress = Math.max(0, Math.min(1, (incoming.audio.currentTime - fade.start) / fadeSeconds));
    if (active) applyVolume(active, fade.outgoingGain * Math.cos(progress * Math.PI / 2));
    applyVolume(incoming, Math.sin(progress * Math.PI / 2));
    if (progress < 1) {
      frame = requestAnimationFrame(updateFade);
      return;
    }
    if (active) clear(active);
    active = incoming;
    incoming = undefined;
    fade = undefined;
  }

  function nextTrack() {
    if (!playlist || incoming) return;
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
    const deck = decks.find(deck => deck !== active)!;
    deck.loops = 0;
    deck.lastTime = 0;
    deck.audio.loop = true;
    if (active) incoming = deck;
    else active = deck;
    applyVolume(deck, deck === incoming ? 0 : 1);
    deck.audio.src = '/assets/audio/music/' + currentTrack + '.mp3';
    resume();
  }

  for (const deck of decks) {
    deck.audio.addEventListener('playing', () => {
      if (deck !== active && deck !== incoming) return;
      failures = 0;
      if (deck === incoming && !fade) {
        if (active) active.audio.loop = false;
        fade = {start: deck.audio.currentTime, outgoingGain: active?.gain ?? 0};
        frame = requestAnimationFrame(updateFade);
      }
    });
    deck.audio.addEventListener('timeupdate', () => {
      if (!deck.audio.hasAttribute('src')) return;
      const {currentTime, duration} = deck.audio;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (deck.lastTime > duration * .8 && currentTime < duration * .2) deck.loops++;
      deck.lastTime = currentTime;
      const loopsToPlay = Math.max(1, Math.round(trackSeconds / duration));
      if (deck === active && !incoming && !deck.audio.paused &&
          deck.loops >= loopsToPlay - 1 && duration - currentTime <= fadeSeconds) nextTrack();
    });
    deck.audio.addEventListener('error', () => {
      if (!playlist || !deck.audio.error || (deck !== incoming && deck !== active)) return;
      clear(deck);
      if (deck === incoming) {
        incoming = undefined;
        fade = undefined;
        cancelAnimationFrame(frame);
        frame = 0;
        if (active) {
          active.audio.loop = true;
          applyVolume(active, 1);
        }
      } else active = undefined;
      if (++failures < playlists[playlist].length) nextTrack();
    });
  }
  document.addEventListener('click', resume, { capture: true });
  document.addEventListener('keydown', resume, { capture: true });
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
  audioSettings.subscribe(() => {
    volume = audioSettings.gain('music');
    for (const deck of decks) applyVolume(deck, deck.gain);
    if (volume === 0) pause();
    else resume();
  });

  return {
    setPlaylist(next?: Playlist) {
      if (next === playlist) return;
      playlist = next;
      queue = [];
      currentTrack = '';
      failures = 0;
      cancelAnimationFrame(frame);
      frame = 0;
      fade = undefined;
      if (!playlist) {
        for (const deck of decks) clear(deck);
        active = incoming = undefined;
        return;
      }
      // A second warp during a fade keeps whichever track is already louder.
      if (incoming) {
        if (incoming.gain > (active?.gain ?? 0)) {
          if (active) clear(active);
          active = incoming;
        } else clear(incoming);
        incoming = undefined;
      }
      if (active) active.audio.loop = true;
      nextTrack();
    },
  };
}
