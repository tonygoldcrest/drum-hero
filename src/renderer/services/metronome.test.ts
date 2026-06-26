import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FakeAudioContext,
  installFetchByByteLength,
  installWebAudio,
} from './audio-player/test-support';

async function loadModule() {
  vi.resetModules();

  return import('./metronome');
}

describe('metronome', () => {
  let context: FakeAudioContext;

  beforeEach(() => {
    context = installWebAudio();
    installFetchByByteLength(() => 8);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preloads the click sample into a buffer', async () => {
    const { preloadMetronome } = await loadModule();

    preloadMetronome();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it('loads the sample only once across repeated calls', async () => {
    const { preloadMetronome, playMetronome } = await loadModule();

    preloadMetronome();
    preloadMetronome();
    playMetronome();
    await vi.waitFor(() => expect(context.bufferSources.length).toBe(1));

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('plays a one-shot source connected to the destination', async () => {
    const { playMetronome } = await loadModule();

    playMetronome();
    await vi.waitFor(() => expect(context.bufferSources.length).toBe(1));

    const source = context.bufferSources[0];

    expect(source.buffer).toBeDefined();
    expect(source.connectedTo).toBe(context.destination);
    expect(source.starts.length).toBe(1);
  });

  it('resumes a suspended audio context before playing', async () => {
    context.state = 'suspended';

    const { playMetronome } = await loadModule();

    playMetronome();
    await vi.waitFor(() => expect(context.resume).toHaveBeenCalled());
  });

  it('does nothing when no AudioContext implementation is available', async () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('fetch', vi.fn());

    const { playMetronome } = await loadModule();

    playMetronome();
    await Promise.resolve();

    expect(fetch).not.toHaveBeenCalled();
    expect(context.bufferSources.length).toBe(0);
  });
});
