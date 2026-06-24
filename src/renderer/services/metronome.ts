import metronomeUrl from '../assets/metronome-sfx.wav';

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | undefined;
let buffer: AudioBuffer | undefined;
let loading: Promise<void> | undefined;

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext
  );
}

function ensureLoaded(): Promise<void> {
  if (loading) {
    return loading;
  }

  const Ctor = getAudioContextCtor();

  if (!Ctor) {
    loading = Promise.resolve();

    return loading;
  }

  context = new Ctor();
  loading = fetch(metronomeUrl)
    .then((response) => response.arrayBuffer())
    .then((data) => context!.decodeAudioData(data))
    .then((decoded) => {
      buffer = decoded;
    })
    .catch(() => {});

  return loading;
}

export function preloadMetronome(): void {
  ensureLoaded();
}

export function playMetronome(): void {
  ensureLoaded().then(() => {
    if (!context || !buffer) {
      return;
    }

    if (context.state === 'suspended') {
      context.resume();
    }

    const source = context.createBufferSource();

    source.buffer = buffer;
    source.connect(context.destination);
    source.start();
  });
}
