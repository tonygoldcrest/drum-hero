import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackConfig } from '../services/audio-player/types';
import { Measure, ParsedChart } from '../../chart-parser/types';
import { getNotification, resetNotification } from './test-support';
import { usePlayback } from './usePlayback';

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();

  return {
    ...actual,
    App: Object.assign({}, actual.App, {
      useApp: () => ({ notification: getNotification() }),
    }),
  };
});

vi.mock('../services/metronome', () => ({
  preloadMetronome: vi.fn(),
  playMetronome: vi.fn(),
}));

vi.mock('../services/audio-player/player', () => {
  class MockAudioPlayer {
    static instances: MockAudioPlayer[] = [];

    onEnded: () => void;

    ready = Promise.resolve([]);

    currentTime = 0;

    duration = 100;

    isInitialised = false;

    audioTracks: unknown[] = [];

    start = vi.fn((offset = 0) => {
      this.isInitialised = true;
      this.currentTime = offset;
    });

    pause = vi.fn();

    stop = vi.fn();

    destroy = vi.fn();

    constructor(_trackData: TrackConfig[], onEnded: () => void) {
      this.onEnded = onEnded;
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

async function getInstances() {
  const mod = await import('../services/audio-player/player');

  return (mod.AudioPlayer as unknown as { instances: MockPlayer[] }).instances;
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

type Props = Parameters<typeof usePlayback>[0];

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function runCountIn() {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
  }
}

async function load(overrides: Partial<Props> = {}) {
  const onEnded = vi.fn();
  const view = renderHook((props: Props) => usePlayback(props), {
    initialProps: {
      trackData: TRACKS,
      chart: CHART,
      measures: MEASURES,
      delaySeconds: 0,
      countInEnabled: false,
      isDev: false,
      onEnded,
      ...overrides,
    },
  });

  await flush();

  const [player] = await getInstances();

  return { view, onEnded, player };
}

beforeEach(async () => {
  resetNotification();
  (await getInstances()).length = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePlayback', () => {
  it('starts idle at position zero', async () => {
    const { view } = await load();

    expect(view.result.current.state).toBe('idle');
    expect(view.result.current.isPlaying).toBe(false);
    expect(view.result.current.timeStore.get()).toBe(0);
  });

  it('plays a tick immediately when the count-in is disabled', async () => {
    const { view, player } = await load({ countInEnabled: false });

    act(() => view.result.current.playFromTick(1920));

    expect(player.start).toHaveBeenCalledTimes(1);
    expect(player.start).toHaveBeenLastCalledWith(expect.closeTo(2));
    expect(view.result.current.isPlaying).toBe(true);
    expect(view.result.current.isStarted).toBe(true);
  });

  it('pins the cursor at the measure start and counts in before starting', async () => {
    const { view, player } = await load({ countInEnabled: true });

    act(() => view.result.current.playFromTick(1920));

    expect(view.result.current.state).toBe('counting-in');
    expect(view.result.current.countInBeat).toBe(1);
    expect(view.result.current.timeStore.get()).toBeCloseTo(2);
    expect(player.start).not.toHaveBeenCalled();

    await runCountIn();

    expect(player.start).toHaveBeenCalledTimes(1);
    expect(player.start).toHaveBeenLastCalledWith(expect.closeTo(2));
    expect(view.result.current.isPlaying).toBe(true);
  });

  it('cancels an in-progress count-in without starting audio', async () => {
    const { view, player } = await load({ countInEnabled: true });

    act(() => view.result.current.playFromTick(0));
    expect(view.result.current.isCounting).toBe(true);

    act(() => view.result.current.cancel());

    await runCountIn();

    expect(player.start).not.toHaveBeenCalled();
    expect(view.result.current.state).toBe('parked');
    expect(view.result.current.countInBeat).toBeUndefined();
  });

  it('parks at the current position when paused', async () => {
    const { view, player } = await load();

    act(() => view.result.current.playFromTick(0));
    player.currentTime = 1.3;

    act(() => view.result.current.pause());

    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(view.result.current.state).toBe('parked');
    expect(view.result.current.timeStore.get()).toBe(1.3);
  });

  it('ignores pause when not playing', async () => {
    const { view, player } = await load();

    act(() => view.result.current.pause());

    expect(player.pause).not.toHaveBeenCalled();
    expect(view.result.current.state).toBe('idle');
  });

  it('plays from the measure containing the parked position', async () => {
    const { view, player } = await load();

    act(() => view.result.current.playFromTick(0));
    player.currentTime = 2.5;
    act(() => view.result.current.pause());

    act(() => view.result.current.play());

    expect(player.start).toHaveBeenLastCalledWith(expect.closeTo(2));
  });

  it('falls back to the start when no measure contains the position', async () => {
    const { view, player } = await load({ measures: [] });

    act(() => view.result.current.play());

    expect(player.start).toHaveBeenLastCalledWith(0);
  });

  it('seeks to an absolute time and plays', async () => {
    const { view, player } = await load();

    act(() => view.result.current.seekSeconds(3));

    expect(player.start).toHaveBeenLastCalledWith(3);
    expect(view.result.current.isPlaying).toBe(true);
  });

  it('enters the ended state and forwards the callback', async () => {
    const { view, onEnded, player } = await load();

    act(() => view.result.current.playFromTick(0));

    act(() => player.onEnded());

    expect(view.result.current.isEnded).toBe(true);
    expect(view.result.current.isPlaying).toBe(false);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});
