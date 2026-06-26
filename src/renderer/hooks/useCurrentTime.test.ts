import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimeStore } from '../services/time-store';
import { useThrottledCurrentTime } from './useCurrentTime';

afterEach(() => {
  vi.useRealTimers();
});

describe('useThrottledCurrentTime', () => {
  it('emits the first change immediately (leading edge)', () => {
    const store = new TimeStore();
    const { result } = renderHook(() => useThrottledCurrentTime(store, 100));

    expect(result.current).toBe(0);

    act(() => store.set(3));

    expect(result.current).toBe(3);
  });

  it('coalesces rapid updates and flushes the latest after the interval', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const store = new TimeStore();
    const { result } = renderHook(() => useThrottledCurrentTime(store, 100));

    act(() => store.set(3));
    expect(result.current).toBe(3);

    act(() => {
      store.set(4);
      store.set(5);
    });
    expect(result.current).toBe(3);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(5);
  });

  it('does not schedule work or update after unmount', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const store = new TimeStore();
    const { result, unmount } = renderHook(() =>
      useThrottledCurrentTime(store, 100),
    );

    act(() => store.set(3));
    act(() => {
      store.set(4);
    });

    unmount();

    expect(() =>
      act(() => {
        store.set(7);
        vi.advanceTimersByTime(500);
      }),
    ).not.toThrow();
    expect(result.current).toBe(3);
  });
});
