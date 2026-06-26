import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Difficulty } from 'scan-chart';
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

interface PagePayload {
  data: Record<string, string>[];
  found?: number;
}

const server: {
  pages: Map<number, PagePayload>;
  fail: boolean;
  requests: { page: number; search: string; difficulty: Difficulty }[];
} = {
  pages: new Map(),
  fail: false,
  requests: [],
};
let notification: NotificationMock;

function chart(md5: string): Record<string, string> {
  return { md5, name: `Name ${md5}` };
}

function setPage(page: number, md5s: string[], found?: number) {
  server.pages.set(page, { data: md5s.map(chart), found });
}

beforeEach(() => {
  notification = resetNotification();
  server.pages = new Map();
  server.fail = false;
  server.requests = [];
  vi.useFakeTimers();

  global.fetch = vi.fn(async (_url: string, opts: { body: string }) => {
    const body = JSON.parse(opts.body) as {
      page: number;
      search: string;
      difficulty: Difficulty;
    };

    server.requests.push({
      page: body.page,
      search: body.search,
      difficulty: body.difficulty,
    });

    if (server.fail) {
      throw new Error('network down');
    }

    const payload = server.pages.get(body.page) ?? { data: [], found: 0 };

    return { json: async () => payload } as Response;
  }) as unknown as typeof fetch;
});

afterEach(() => {
  vi.useRealTimers();
});

async function load(
  active: boolean,
  search: string,
  difficulty: Difficulty = 'expert',
) {
  const { useOnlineSearch } = await import('./useOnlineSearch');

  return renderHook(
    ({ a, s, d }: { a: boolean; s: string; d: Difficulty }) =>
      useOnlineSearch(a, s, d),
    { initialProps: { a: active, s: search, d: difficulty } },
  );
}

async function settle(ms = 300) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function ids(list: { id: string }[]) {
  return list.map((s) => s.id);
}

describe('useOnlineSearch', () => {
  it('does not fetch while inactive', async () => {
    const { result } = await load(false, 'metallica');

    await settle();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('fetches the first two pages and combines them', async () => {
    setPage(1, ['a', 'b'], 10);
    setPage(2, ['c'], 10);

    const { result } = await load(true, 'metallica');

    await settle();

    expect(ids(result.current.results)).toEqual(['a', 'b', 'c']);
    expect(result.current.total).toBe(10);
    expect(result.current.loading).toBe(false);
  });

  it('deduplicates songs that appear on both pages', async () => {
    setPage(1, ['a', 'b'], 10);
    setPage(2, ['b', 'c'], 10);

    const { result } = await load(true, 'x');

    await settle();

    expect(ids(result.current.results)).toEqual(['a', 'b', 'c']);
  });

  it('reports no more pages once the total is reached', async () => {
    setPage(1, ['a', 'b'], 3);
    setPage(2, ['c'], 3);

    const { result } = await load(true, 'x');

    await settle();

    expect(result.current.results).toHaveLength(3);
  });

  it('debounces rapid search changes into a single query', async () => {
    setPage(1, ['a'], 1);
    setPage(2, [], 1);

    const { rerender } = await load(true, 'a');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    rerender({ a: true, s: 'ab', d: 'expert' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    rerender({ a: true, s: 'abc', d: 'expert' });

    await settle();

    const searches = server.requests.map((r) => r.search);

    expect(searches.every((s) => s === 'abc')).toBe(true);
  });

  it('loads the next page on demand and appends results', async () => {
    setPage(1, ['a', 'b'], 10);
    setPage(2, ['c'], 10);
    setPage(3, ['d'], 10);

    const { result } = await load(true, 'x');

    await settle();
    expect(ids(result.current.results)).toEqual(['a', 'b', 'c']);

    await act(async () => {
      result.current.loadMore();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(ids(result.current.results)).toEqual(['a', 'b', 'c', 'd']);
    expect(server.requests.map((r) => r.page)).toContain(3);
  });

  it('does not load more when there are no further pages', async () => {
    setPage(1, ['a', 'b'], 2);
    setPage(2, [], 2);

    const { result } = await load(true, 'x');

    await settle();

    const before = server.requests.length;

    await act(async () => {
      result.current.loadMore();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(server.requests.length).toBe(before);
  });

  it('notifies and clears loading on a failed search', async () => {
    server.fail = true;

    const { result } = await load(true, 'x');

    await settle();

    expect(notification.error).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual([]);
  });

  it('serves a repeated query from cache without refetching', async () => {
    setPage(1, ['a'], 5);
    setPage(2, ['b'], 5);

    const { rerender } = await load(true, 'first');

    await settle();

    const afterFirst = server.requests.length;

    rerender({ a: true, s: 'second', d: 'expert' });
    await settle();

    rerender({ a: true, s: 'first', d: 'expert' });
    await settle();

    expect(server.requests.length).toBeLessThan(afterFirst * 3);
  });

  it('stops loading when deactivated mid-search', async () => {
    setPage(1, ['a'], 5);
    setPage(2, ['b'], 5);

    const { result, rerender } = await load(true, 'x');

    rerender({ a: false, s: 'x', d: 'expert' });

    await settle();

    expect(result.current.loading).toBe(false);
  });

  it('sends the selected difficulty and refetches when it changes', async () => {
    setPage(1, ['a'], 1);
    setPage(2, [], 1);

    const { rerender } = await load(true, 'x', 'hard');

    await settle();

    expect(server.requests.every((r) => r.difficulty === 'hard')).toBe(true);

    const afterHard = server.requests.length;

    rerender({ a: true, s: 'x', d: 'easy' });
    await settle();

    expect(
      server.requests.slice(afterHard).some((r) => r.difficulty === 'easy'),
    ).toBe(true);
  });

  it('derives drumDifficulties from the note counts', async () => {
    server.pages.set(1, {
      data: [
        {
          md5: 'a',
          name: 'Name a',
          notesData: {
            noteCounts: [
              { instrument: 'drums', difficulty: 'expert', count: 10 },
              { instrument: 'drums', difficulty: 'hard', count: 5 },
              { instrument: 'drums', difficulty: 'easy', count: 0 },
              { instrument: 'guitar', difficulty: 'expert', count: 3 },
            ],
          },
        } as unknown as Record<string, string>,
      ],
      found: 1,
    });
    setPage(2, [], 1);

    const { result } = await load(true, 'x');

    await settle();

    expect(result.current.results[0].drumDifficulties).toEqual([
      'hard',
      'expert',
    ]);
  });

  it('does not throw when unmounted before the request resolves', async () => {
    setPage(1, ['a'], 5);
    setPage(2, ['b'], 5);

    const { unmount } = await load(true, 'x');

    unmount();

    await expect(settle()).resolves.toBeUndefined();
  });
});
