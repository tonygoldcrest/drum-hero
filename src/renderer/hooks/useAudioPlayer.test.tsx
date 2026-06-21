import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackConfig } from '../services/audio-player/types';
import {
  getNotification,
  NotificationMock,
  resetNotification,
} from './test-support';

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();

  return {
    ...actual,
    App: Object.assign({}, actual.App, {
      useApp: () => ({ notification: getNotification() }),
    }),
  };
});

vi.mock('../services/audio-player/player', () => {
  class MockAudioPlayer {
    static instances: MockAudioPlayer[] = [];

    static failNext = false;

    trackData: TrackConfig[];

    onEnded: () => void;

    ready: Promise<unknown>;

    currentTime = 0;

    isInitialised = false;

    start = vi.fn(() => {
      this.isInitialised = true;
    });

    resume = vi.fn();

    pause = vi.fn();

    stop = vi.fn(() => {
      this.isInitialised = false;
    });

    destroy = vi.fn();

    constructor(trackData: TrackConfig[], onEnded: () => void) {
      this.trackData = trackData;
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
  currentTime: number;
  isInitialised: boolean;
  onEnded: () => void;
  start: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

let notification: NotificationMock;

async function getPlayerClass() {
  const mod = await import('../services/audio-player/player');

  return mod.AudioPlayer as unknown as {
    instances: MockPlayer[];
    failNext: boolean;
  };
}

const TRACKS: TrackConfig[] = [{ name: 'drums', urls: ['d.ogg'] }];

beforeEach(async () => {
  notification = resetNotification();

  const Cls = await getPlayerClass();

  Cls.instances = [];
  Cls.failNext = false;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function load(
  trackData: TrackConfig[],
  isDev = false,
  onEnded: () => void = () => {},
) {
  const { useAudioPlayer } = await import('./useAudioPlayer');
  const view = renderHook(
    ({ td, dev }: { td: TrackConfig[]; dev: boolean }) =>
      useAudioPlayer(td, dev, onEnded),
    { initialProps: { td: trackData, dev: isDev } },
  );

  await flush();

  return view;
}

describe('useAudioPlayer', () => {
  it('creates no player without tracks', async () => {
    const { result } = await load([]);
    const Cls = await getPlayerClass();

    expect(Cls.instances).toHaveLength(0);
    expect(result.current.audioPlayer).toBeNull();
  });

  it('exposes the player once it is ready', async () => {
    const { result } = await load(TRACKS);

    expect(result.current.audioPlayer).not.toBeNull();
  });

  it('notifies and stays null when loading fails', async () => {
    const Cls = await getPlayerClass();

    Cls.failNext = true;

    const { result } = await load(TRACKS);

    expect(result.current.audioPlayer).toBeNull();
    expect(notification.error).toHaveBeenCalledTimes(1);
  });

  it('polls the current playback position', async () => {
    const { result } = await load(TRACKS);
    const Cls = await getPlayerClass();

    Cls.instances[0].currentTime = 7;

    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.currentTime).toBe(7);
  });

  it('starts playback when not yet initialised', async () => {
    const { result } = await load(TRACKS);
    const Cls = await getPlayerClass();

    act(() => result.current.setIsPlaying(true));

    expect(Cls.instances[0].start).toHaveBeenCalledTimes(1);
    expect(Cls.instances[0].resume).not.toHaveBeenCalled();
  });

  it('pauses then resumes an already initialised player', async () => {
    const { result } = await load(TRACKS);
    const Cls = await getPlayerClass();

    act(() => result.current.setIsPlaying(true));
    act(() => result.current.setIsPlaying(false));
    expect(Cls.instances[0].pause).toHaveBeenCalledTimes(1);

    act(() => result.current.setIsPlaying(true));
    expect(Cls.instances[0].resume).toHaveBeenCalledTimes(1);
  });

  it('flips isPlaying back and fires onEnded when the player reports it ended', async () => {
    const onEnded = vi.fn();
    const { result } = await load(TRACKS, false, onEnded);
    const Cls = await getPlayerClass();

    act(() => result.current.setIsPlaying(true));
    expect(result.current.isPlaying).toBe(true);

    act(() => Cls.instances[0].onEnded());

    expect(result.current.isPlaying).toBe(false);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('destroys the player on unmount in production', async () => {
    const { unmount } = await load(TRACKS, false);
    const Cls = await getPlayerClass();

    unmount();

    expect(Cls.instances[0].destroy).toHaveBeenCalledTimes(1);
    expect(Cls.instances[0].stop).not.toHaveBeenCalled();
  });

  it('only stops the player on unmount in dev mode', async () => {
    const { unmount } = await load(TRACKS, true);
    const Cls = await getPlayerClass();

    unmount();

    expect(Cls.instances[0].stop).toHaveBeenCalledTimes(1);
    expect(Cls.instances[0].destroy).not.toHaveBeenCalled();
  });

  it('stops polling after unmount', async () => {
    const { result, unmount } = await load(TRACKS);
    const Cls = await getPlayerClass();

    unmount();
    Cls.instances[0].currentTime = 99;

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.currentTime).not.toBe(99);
  });
});
