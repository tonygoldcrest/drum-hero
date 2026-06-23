import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimeStore } from '../services/time-store';
import { useCurrentTime, useThrottledCurrentTime } from './useCurrentTime';

afterEach(() => {
  vi.useRealTimers();
});

describe('useCurrentTime', () => {
  it('returns the store value at mount', () => {
    const store = new TimeStore();

    store.set(2);

    const { result } = renderHook(() => useCurrentTime(store));

    expect(result.current).toBe(2);
  });

  it('re-renders with the new value when the store changes', () => {
    const store = new TimeStore();
    const { result } = renderHook(() => useCurrentTime(store));

    expect(result.current).toBe(0);

    act(() => store.set(5));

    expect(result.current).toBe(5);
  });

  it('does not re-render when the store is set to the same value', () => {
    const store = new TimeStore();
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;

      return useCurrentTime(store);
    });
    const before = renders;

    act(() => store.set(0));

    expect(renders).toBe(before);
    expect(result.current).toBe(0);
  });

  it('stops updating after unmount', () => {
    const store = new TimeStore();
    const { result, unmount } = renderHook(() => useCurrentTime(store));

    unmount();

    act(() => store.set(9));

    expect(result.current).toBe(0);
  });
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
