import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackConfig } from './audio-player/types';
import { Measure, ParsedChart } from '../../chart-parser/types';
import { Transport, TransportContext } from './transport';

vi.mock('./metronome', () => ({
  preloadMetronome: vi.fn(),
  playMetronome: vi.fn(),
}));

vi.mock('./audio-player/player', () => {
  class MockAudioPlayer {
    static instances: MockAudioPlayer[] = [];
    static failNext = false;
    onEnded: () => void;
    ready: Promise<unknown>;
    currentTime = 0;
    duration = 100;
    isInitialised = false;

    start = vi.fn((offset = 0) => {
      this.isInitialised = true;
      this.currentTime = offset;
    });

    pause = vi.fn();

    stop = vi.fn(() => {
      this.isInitialised = false;
    });

    destroy = vi.fn();

    constructor(_trackData: TrackConfig[], onEnded: () => void) {
      this.onEnded = onEnded;
      this.ready = MockAudioPlayer.failNext
        ? Promise.reject(new Error('load failed'))
        : Promise.resolve([]);
      this.ready.catch(() => {});
      MockAudioPlayer.instances.push(this);
    }
  }

  return { AudioPlayer: MockAudioPlayer };
});

type MockPlayer = {
  onEnded: () => void;
  currentTime: number;
  duration: number;
  isInitialised: boolean;
  start: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

async function getPlayerClass() {
  const mod = await import('./audio-player/player');

  return mod.AudioPlayer as unknown as {
    instances: MockPlayer[];
    failNext: boolean;
  };
}

const TRACKS: TrackConfig[] = [{ name: 'drums', urls: ['d.ogg'] }];
const CHART = {
  resolution: 480,
  tempos: [{ tick: 0, beatsPerMinute: 120, msTime: 0 }],
} as unknown as ParsedChart;
const MEASURES = [
  { startTick: 0, endTick: 1920, timeSig: [4, 4] },
  { startTick: 1920, endTick: 3840, timeSig: [4, 4] },
] as unknown as Measure[];
const CTX: TransportContext = {
  chart: CHART,
  measures: MEASURES,
  delaySeconds: 0,
  countInEnabled: false,
  minDurationSeconds: 0,
};

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

async function setup(
  options: Partial<{ trackData: TrackConfig[]; isDev: boolean }> = {},
  context: Partial<TransportContext> = {},
) {
  const onEnded = vi.fn();
  const onError = vi.fn();
  const engine = new Transport({
    trackData: TRACKS,
    isDev: false,
    onEnded,
    onError,
    ...options,
  });

  engine.setContext({ ...CTX, ...context });

  await flush();

  const [player] = (await getPlayerClass()).instances;

  return { engine, onEnded, onError, player };
}

function runCountIn(beats = 4, beatMs = 500) {
  for (let i = 0; i < beats; i += 1) {
    vi.advanceTimersByTime(beatMs);
  }
}

beforeEach(async () => {
  const Cls = await getPlayerClass();

  Cls.instances.length = 0;
  Cls.failNext = false;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Transport', () => {
  it('starts idle at position zero', async () => {
    const { engine } = await setup();

    expect(engine.getSnapshot().state).toBe('idle');
    expect(engine.getSnapshot().isPlaying).toBe(false);
    expect(engine.timeStore.get()).toBe(0);
  });

  it('creates no player without tracks', async () => {
    const { engine } = await setup({ trackData: [] });

    expect((await getPlayerClass()).instances).toHaveLength(0);
    expect(engine.getSnapshot().isReady).toBe(false);
  });

  it('exposes the player and duration once ready', async () => {
    const { engine } = await setup();

    expect(engine.getSnapshot().isReady).toBe(true);
    expect(engine.getSnapshot().duration).toBe(100);
  });

  it('reports an error and stays player-less when loading fails', async () => {
    (await getPlayerClass()).failNext = true;

    const { engine, onError } = await setup();

    expect(engine.getSnapshot().isReady).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('plays a tick immediately when the count-in is disabled', async () => {
    const { engine, player } = await setup();

    engine.playFromTick(1920);

    expect(player.start).toHaveBeenCalledTimes(1);
    expect(player.start).toHaveBeenLastCalledWith(expect.closeTo(2));
    expect(engine.getSnapshot().isPlaying).toBe(true);
    expect(engine.getSnapshot().isStarted).toBe(true);
  });

  it('pins the cursor at the measure start and counts in before starting', async () => {
    const { engine, player } = await setup({}, { countInEnabled: true });

    engine.playFromTick(1920);

    expect(engine.getSnapshot().state).toBe('counting-in');
    expect(engine.getSnapshot().countInBeat).toBe(1);
    expect(engine.timeStore.get()).toBeCloseTo(2);
    expect(player.start).not.toHaveBeenCalled();

    runCountIn();

    expect(player.start).toHaveBeenCalledTimes(1);
    expect(player.start).toHaveBeenLastCalledWith(expect.closeTo(2));
    expect(engine.getSnapshot().isPlaying).toBe(true);
  });

  it('restarts the count-in from the first beat', async () => {
    const { engine } = await setup({}, { countInEnabled: true });

    engine.playFromTick(0);
    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(500);
    expect(engine.getSnapshot().countInBeat).toBe(3);

    engine.playFromTick(0);
    expect(engine.getSnapshot().countInBeat).toBe(1);
  });

  it('stops the running audio when a new count-in begins mid-playback', async () => {
    const { engine, player } = await setup({}, { countInEnabled: true });

    engine.playFromTick(0);
    runCountIn();

    expect(engine.getSnapshot().isPlaying).toBe(true);
    expect(player.isInitialised).toBe(true);

    engine.playFromTick(1920);

    expect(engine.getSnapshot().state).toBe('counting-in');
    expect(player.isInitialised).toBe(false);
  });

  it('leaves nothing playing when the play button cancels a mid-playback count-in', async () => {
    const { engine, player } = await setup({}, { countInEnabled: true });

    engine.playFromTick(0);
    runCountIn();
    player.start.mockClear();

    engine.playFromTick(1920);
    engine.cancel();
    runCountIn();

    expect(engine.getSnapshot().state).toBe('parked');
    expect(player.isInitialised).toBe(false);
    expect(player.start).not.toHaveBeenCalled();
  });

  it('cancels an in-progress count-in without starting audio', async () => {
    const { engine, player } = await setup({}, { countInEnabled: true });

    engine.playFromTick(0);
    expect(engine.getSnapshot().isCounting).toBe(true);

    engine.cancel();
    runCountIn();

    expect(player.start).not.toHaveBeenCalled();
    expect(engine.getSnapshot().state).toBe('parked');
    expect(engine.getSnapshot().countInBeat).toBeUndefined();
  });

  it('parks at the current position when paused', async () => {
    const { engine, player } = await setup();

    engine.playFromTick(0);
    player.currentTime = 1.3;

    engine.pause();

    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(engine.getSnapshot().state).toBe('parked');
    expect(engine.timeStore.get()).toBe(1.3);
  });

  it('ignores pause when not playing', async () => {
    const { engine, player } = await setup();

    engine.pause();

    expect(player.pause).not.toHaveBeenCalled();
    expect(engine.getSnapshot().state).toBe('idle');
  });

  it('plays from the measure containing the parked position', async () => {
    const { engine, player } = await setup();

    engine.playFromTick(0);
    player.currentTime = 2.5;
    engine.pause();

    engine.play();

    expect(player.start).toHaveBeenLastCalledWith(expect.closeTo(2));
  });

  it('falls back to the start when no measure contains the position', async () => {
    const { engine, player } = await setup({}, { measures: [] });

    engine.play();

    expect(player.start).toHaveBeenLastCalledWith(0);
  });

  it('seeks to an absolute time and plays', async () => {
    const { engine, player } = await setup();

    engine.seekSeconds(3);

    expect(player.start).toHaveBeenLastCalledWith(3);
    expect(engine.getSnapshot().isPlaying).toBe(true);
  });

  it('enters the ended state and forwards the callback', async () => {
    const { engine, onEnded, player } = await setup();

    engine.playFromTick(0);
    player.onEnded();

    expect(engine.getSnapshot().isEnded).toBe(true);
    expect(engine.getSnapshot().isPlaying).toBe(false);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on state changes until unsubscribed', async () => {
    const { engine } = await setup();
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);

    engine.playFromTick(0);
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    unsubscribe();
    engine.pause();
    expect(listener).not.toHaveBeenCalled();
  });

  it('seeking during a count-in cancels it and plays from the seeked time', async () => {
    const { engine, player } = await setup({}, { countInEnabled: true });

    engine.playFromTick(0);
    expect(engine.getSnapshot().isCounting).toBe(true);

    engine.seekSeconds(5);

    expect(engine.getSnapshot().isPlaying).toBe(true);
    expect(player.start).toHaveBeenCalledTimes(1);
    expect(player.start).toHaveBeenLastCalledWith(5);

    runCountIn();

    expect(player.start).toHaveBeenCalledTimes(1);
  });

  it('counts in from the new measure when one is clicked after pausing', async () => {
    const { engine, player } = await setup({}, { countInEnabled: true });

    engine.playFromTick(0);
    runCountIn();
    player.currentTime = 1;
    engine.pause();

    expect(engine.getSnapshot().state).toBe('parked');

    player.start.mockClear();
    engine.playFromTick(1920);

    expect(engine.getSnapshot().state).toBe('counting-in');
    expect(player.isInitialised).toBe(false);

    runCountIn();

    expect(player.start).toHaveBeenCalledTimes(1);
    expect(player.start).toHaveBeenLastCalledWith(expect.closeTo(2));
  });

  it('jumps straight to a clicked measure when the count-in is disabled', async () => {
    const { engine, player } = await setup();

    engine.playFromTick(0);
    player.start.mockClear();

    engine.playFromTick(1920);

    expect(engine.getSnapshot().isPlaying).toBe(true);
    expect(player.stop).toHaveBeenCalled();
    expect(player.start).toHaveBeenLastCalledWith(expect.closeTo(2));
  });

  it('only the latest count-in completes when measures are clicked rapidly', async () => {
    const { engine, player } = await setup({}, { countInEnabled: true });

    engine.playFromTick(0);
    engine.playFromTick(1920);

    runCountIn();

    expect(player.start).toHaveBeenCalledTimes(1);
    expect(player.start).toHaveBeenLastCalledWith(expect.closeTo(2));
  });

  it('can restart after the song ends', async () => {
    const { engine, player } = await setup();

    engine.playFromTick(0);
    player.onEnded();
    expect(engine.getSnapshot().isEnded).toBe(true);

    player.start.mockClear();
    engine.play();

    expect(engine.getSnapshot().isPlaying).toBe(true);
    expect(player.start).toHaveBeenCalledTimes(1);
  });

  it('ignores pause during a count-in', async () => {
    const { engine, player } = await setup({}, { countInEnabled: true });

    engine.playFromTick(0);
    engine.pause();

    expect(player.pause).not.toHaveBeenCalled();
    expect(engine.getSnapshot().state).toBe('counting-in');
  });

  it('ignores cancel when not counting in', async () => {
    const { engine } = await setup();

    engine.cancel();

    expect(engine.getSnapshot().state).toBe('idle');
  });

  it('lets a following pause stop playback when the back button cancels mid-play', async () => {
    const { engine, player } = await setup();

    engine.playFromTick(0);
    player.currentTime = 1;

    engine.cancel();
    engine.pause();

    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(engine.getSnapshot().state).toBe('parked');
    expect(engine.timeStore.get()).toBe(1);
  });

  it('offsets the audio start by the configured delay', async () => {
    const { engine, player } = await setup({}, { delaySeconds: 0.5 });

    engine.playFromTick(1920);

    expect(player.start).toHaveBeenLastCalledWith(expect.closeTo(2.5));
  });

  it('ignores play without a chart', async () => {
    const { engine, player } = await setup({}, { chart: undefined });

    engine.play();

    expect(player.start).not.toHaveBeenCalled();
    expect(engine.getSnapshot().state).toBe('idle');
  });

  it('ignores seek before the player is ready', async () => {
    const { engine } = await setup({ trackData: [] });

    engine.seekSeconds(3);

    expect(engine.getSnapshot().isPlaying).toBe(false);
  });

  it('destroys the player on dispose in production', async () => {
    const { engine, player } = await setup();

    engine.dispose();

    expect(player.destroy).toHaveBeenCalledTimes(1);
    expect(player.stop).not.toHaveBeenCalled();
  });

  it('only stops the player on dispose in dev mode', async () => {
    const { engine, player } = await setup({ isDev: true });

    engine.dispose();

    expect(player.stop).toHaveBeenCalledTimes(1);
    expect(player.destroy).not.toHaveBeenCalled();
  });
});
