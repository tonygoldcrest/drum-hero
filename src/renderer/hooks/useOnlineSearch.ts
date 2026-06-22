import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App } from 'antd';
import { debounce, uniqBy } from 'es-toolkit';
import { SongData } from '../../types';

type PageResult = { songs: SongData[]; total: number | undefined };

function mapSongs(data: Record<string, string>[]): SongData[] {
  return uniqBy(
    data.map(
      (chart) =>
        ({
          id: chart.md5,
          dir: `https://files.enchor.us/${chart.md5}.sng`,
          albumCover: chart.albumArtMd5
            ? `https://files.enchor.us/${chart.albumArtMd5}.jpg`
            : null,
          name: chart.name ?? '',
          artist: chart.artist ?? '',
          charter: chart.charter ?? '',
          album: chart.album ?? '',
          year: chart.year ?? '',
          genre: chart.genre ?? '',
          song_length: String(chart.song_length ?? ''),
          diff_drums: String(chart.diff_drums ?? ''),
          diff_drums_real: String(chart.diff_drums_real ?? ''),
        }) as SongData,
    ),
    (song) => song.id,
  );
}

async function fetchEnchorePage(
  query: string,
  page: number,
  signal: AbortSignal,
): Promise<PageResult> {
  const res = await fetch('https://api.enchor.us/search', {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      search: query,
      page,
      instrument: 'drums',
      drumType: 'fourLanePro',
      source: 'website',
      drumsReviewed: false,
    }),
    method: 'POST',
    signal,
  });
  const json = await res.json();

  return {
    songs: mapSongs(json.data ?? []),
    total: (json.found as number | undefined) ?? undefined,
  };
}

export function useOnlineSearch(active: boolean, search: string) {
  const { notification } = App.useApp();
  const [results, setResults] = useState<SongData[]>([]);
  const [total, setTotal] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const searchRef = useRef(search);
  const cache = useRef<Map<string, PageResult>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const fetchPage = useCallback(
    async (query: string, page: number, append: boolean) => {
      const cacheKey = `${query}:${page}`;

      if (cache.current.has(cacheKey)) {
        const cached = cache.current.get(cacheKey)!;

        setResults((prev) => {
          const next = append
            ? uniqBy([...prev, ...cached.songs], (s) => s.id)
            : cached.songs;

          setHasMore(
            cached.total !== undefined
              ? next.length < cached.total
              : cached.songs.length > 0,
          );

          return next;
        });

        if (cached.total !== undefined) {
          setTotal(cached.total);
        }

        setLoading(false);

        return;
      }

      abortRef.current?.abort();

      const controller = new AbortController();

      abortRef.current = controller;

      try {
        const { songs, total: pageTotal } = await fetchEnchorePage(
          query,
          page,
          controller.signal,
        );

        cache.current.set(cacheKey, { songs, total: pageTotal });
        setResults((prev) => {
          const next = append
            ? uniqBy([...prev, ...songs], (s) => s.id)
            : songs;

          setHasMore(
            pageTotal !== undefined
              ? next.length < pageTotal
              : songs.length > 0,
          );

          return next;
        });

        if (pageTotal !== undefined) {
          setTotal(pageTotal);
        }

        setLoading(false);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        notification.error({
          message: 'Search failed',
          description:
            'Unable to fetch songs from Encore. Please check your connection.',
          placement: 'bottomRight',
        });
        setLoading(false);
      }
    },
    [notification],
  );
  const debouncedFetch = useMemo(
    () =>
      debounce(async (query: string) => {
        abortRef.current?.abort();

        const controller = new AbortController();

        abortRef.current = controller;

        const getOrFetch = async (page: number): Promise<PageResult> => {
          const cacheKey = `${query}:${page}`;
          const cached = cache.current.get(cacheKey);

          if (cached) {
            return cached;
          }

          const r = await fetchEnchorePage(query, page, controller.signal);

          cache.current.set(cacheKey, r);

          return r;
        };

        try {
          const [p1, p2] = await Promise.all([getOrFetch(1), getOrFetch(2)]);

          if (controller.signal.aborted) {
            return;
          }

          const combined = uniqBy([...p1.songs, ...p2.songs], (s) => s.id);
          const pageTotal = p1.total ?? p2.total;

          pageRef.current = 2;
          setResults(() => {
            setHasMore(
              pageTotal !== undefined
                ? combined.length < pageTotal
                : p2.songs.length > 0,
            );

            return combined;
          });

          if (pageTotal !== undefined) {
            setTotal(pageTotal);
          }

          setLoading(false);
        } catch (err) {
          if (controller.signal.aborted) {
            return;
          }

          notification.error({
            message: 'Search failed',
            description:
              'Unable to fetch songs from Encore. Please check your connection.',
            placement: 'bottomRight',
          });
          setLoading(false);
        }
      }, 300),
    [notification],
  );

  useEffect(() => {
    if (!active) {
      return;
    }

    searchRef.current = search;
    setResults([]);
    setTotal(undefined);
    setHasMore(true);
    setLoading(true);
    debouncedFetch(search);

    return () => {
      debouncedFetch.cancel();
      abortRef.current?.abort();
      setLoading(false);
    };
  }, [active, search, debouncedFetch]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) {
      return;
    }

    pageRef.current += 1;
    fetchPage(searchRef.current, pageRef.current, true);
  }, [loading, hasMore, fetchPage]);

  return { results, total, loading, loadMore };
}
