import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountIn } from './useCountIn';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

function advanceBeats(count: number, beatMs = 100) {
  for (let i = 0; i < count; i += 1) {
    act(() => vi.advanceTimersByTime(beatMs));
  }
}

describe('useCountIn', () => {
  it('is idle before starting', () => {
    const { result } = renderHook(() => useCountIn());

    expect(result.current.count).toBeUndefined();
    expect(result.current.isCounting).toBe(false);
  });

  it('shows the first beat immediately on start', () => {
    const { result } = renderHook(() => useCountIn());

    act(() => {
      result.current.start({ beats: 4, beatMs: 100, onComplete: vi.fn() });
    });

    expect(result.current.count).toBe(1);
    expect(result.current.isCounting).toBe(true);
  });

  it('counts up one beat per interval', () => {
    const { result } = renderHook(() => useCountIn());

    act(() => {
      result.current.start({ beats: 4, beatMs: 100, onComplete: vi.fn() });
    });

    act(() => vi.advanceTimersByTime(100));
    expect(result.current.count).toBe(2);

    act(() => vi.advanceTimersByTime(100));
    expect(result.current.count).toBe(3);

    act(() => vi.advanceTimersByTime(100));
    expect(result.current.count).toBe(4);
  });

  it('calls onComplete after the final beat and returns to idle', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountIn());

    act(() => {
      result.current.start({ beats: 4, beatMs: 100, onComplete });
    });

    advanceBeats(3);
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current.count).toBe(4);

    advanceBeats(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.count).toBeUndefined();
    expect(result.current.isCounting).toBe(false);
  });

  it('completes after a single beat when beats is one', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountIn());

    act(() => {
      result.current.start({ beats: 1, beatMs: 100, onComplete });
    });

    expect(result.current.count).toBe(1);

    act(() => vi.advanceTimersByTime(100));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.isCounting).toBe(false);
  });

  it('does not advance further once completed', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountIn());

    act(() => {
      result.current.start({ beats: 2, beatMs: 100, onComplete });
    });

    advanceBeats(5);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.count).toBeUndefined();
  });

  it('cancel stops counting and prevents onComplete', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountIn());

    act(() => {
      result.current.start({ beats: 4, beatMs: 100, onComplete });
    });

    act(() => vi.advanceTimersByTime(100));
    expect(result.current.count).toBe(2);

    act(() => result.current.cancel());

    expect(result.current.count).toBeUndefined();
    expect(result.current.isCounting).toBe(false);

    act(() => vi.advanceTimersByTime(1000));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('restarts from the first beat when started again mid-count', () => {
    const firstComplete = vi.fn();
    const secondComplete = vi.fn();
    const { result } = renderHook(() => useCountIn());

    act(() => {
      result.current.start({
        beats: 4,
        beatMs: 100,
        onComplete: firstComplete,
      });
    });

    advanceBeats(2);
    expect(result.current.count).toBe(3);

    act(() => {
      result.current.start({
        beats: 4,
        beatMs: 100,
        onComplete: secondComplete,
      });
    });
    expect(result.current.count).toBe(1);

    advanceBeats(4);

    expect(firstComplete).not.toHaveBeenCalled();
    expect(secondComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onComplete after unmount', () => {
    const onComplete = vi.fn();
    const { result, unmount } = renderHook(() => useCountIn());

    act(() => {
      result.current.start({ beats: 2, beatMs: 100, onComplete });
    });

    unmount();

    act(() => vi.advanceTimersByTime(1000));

    expect(onComplete).not.toHaveBeenCalled();
  });
});
