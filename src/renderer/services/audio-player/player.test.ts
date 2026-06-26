import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPlayer } from './player';
import { TrackConfig } from './types';
import {
  FakeAudioContext,
  installFetchByByteLength,
  installWebAudio,
} from './test-support';

vi.mock('./utils', () => ({
  trimTrailingSilence: (buffer: unknown) => buffer,
}));

let context: FakeAudioContext;
const DURATIONS: Record<string, number> = {
  'drums.ogg': 300,
  'song.ogg': 500,
};
const TRACKS: TrackConfig[] = [
  { name: 'drums', urls: ['drums.ogg'] },
  { name: 'song', urls: ['song.ogg'] },
];

async function makePlayer(tracks: TrackConfig[] = TRACKS, onEnded = vi.fn()) {
  const player = new AudioPlayer(tracks, onEnded);

  await player.ready;
  await Promise.resolve();

  return { player, onEnded };
}

beforeEach(() => {
  context = installWebAudio();
  installFetchByByteLength((url) => DURATIONS[url] ?? 100);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AudioPlayer', () => {
  it('fetches, decodes and exposes the longest track as the duration', async () => {
    const { player } = await makePlayer();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(player.audioTracks).toHaveLength(2);
    expect(player.duration).toBe(500);
  });

  it('resumes a suspended context and starts every track on play', async () => {
    const { player } = await makePlayer();

    context.state = 'suspended';
    context.currentTime = 10;
    player.start(2);

    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(player.isInitialised).toBe(true);
    context.bufferSources.forEach((source) =>
      expect(source.starts.at(-1)).toEqual({ at: 10, offset: 2 }),
    );
  });

  it('stops the running playback before starting again', async () => {
    const { player } = await makePlayer();

    player.start(0);

    const firstSources = [...context.bufferSources];

    player.start(0);

    firstSources.forEach((source) => expect(source.stopped).toBe(true));
  });

  it('reports currentTime as elapsed time plus the offset, minus latency', async () => {
    const { player } = await makePlayer();

    context.outputLatency = 0.05;
    context.currentTime = 0;
    player.start(2);

    context.currentTime = 5;

    expect(player.currentTime).toBeCloseTo(5 + 2 - 0.05, 5);
  });

  it('clamps currentTime to the offset and returns zero before starting', async () => {
    const { player } = await makePlayer();

    expect(player.currentTime).toBe(0);

    context.currentTime = 0;
    player.start(3);

    expect(player.currentTime).toBe(3);
  });

  it('suspends the context on pause', async () => {
    const { player } = await makePlayer();

    player.pause();

    expect(context.suspend).toHaveBeenCalledTimes(1);
  });

  it('only fires onEnded once every track has ended', async () => {
    const { player, onEnded } = await makePlayer();

    player.audioTracks[0].ended = true;
    player.trackEndedListener();
    expect(onEnded).not.toHaveBeenCalled();

    player.audioTracks[1].ended = true;
    player.trackEndedListener();
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(player.isInitialised).toBe(false);
  });

  it('closes the context and drops tracks on destroy', async () => {
    const { player, onEnded } = await makePlayer();

    player.destroy();

    expect(context.close).toHaveBeenCalledTimes(1);
    expect(player.audioTracks).toHaveLength(0);
    expect(player.onEnded).toBeNull();
    expect(onEnded).not.toHaveBeenCalled();
  });
});
