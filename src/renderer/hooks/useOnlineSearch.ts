import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce, uniqBy } from 'es-toolkit';
import { SongData } from '../../types';

export function useOnlineSearch(active: boolean, search: string) {
  const [results, setResults] = useState<SongData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const searchRef = useRef(search);
  const cache = useRef<Map<string, SongData[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const fetchPage = useCallback(
    (query: string, page: number, append: boolean) => {
      const cacheKey = `${query}:${page}`;

      if (cache.current.has(cacheKey)) {
        const cached = cache.current.get(cacheKey)!;

        setResults((prev) =>
          append ? uniqBy([...prev, ...cached], (s) => s.id) : cached,
        );
        setHasMore(cached.length > 0);
        setLoading(false);

        return;
      }

      abortRef.current?.abort();

      const controller = new AbortController();

      abortRef.current = controller;
      fetch('https://api.enchor.us/search', {
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
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((result) => {
          const songs: SongData[] = uniqBy(
            (result.data ?? []).map((chart: Record<string, string>) => ({
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
            })),
            (song) => song.id,
          );

          cache.current.set(cacheKey, songs);
          setResults((prev) =>
            append ? uniqBy([...prev, ...songs], (s) => s.id) : songs,
          );
          setHasMore(songs.length > 0);
          setLoading(false);
        })
        .catch((err) => {
          if (controller.signal.aborted) {
            return;
          }

          console.error('Encore fetch error:', err);
          setLoading(false);
        });
    },
    [],
  );
  const debouncedFetch = useMemo(
    () =>
      debounce((query: string) => {
        pageRef.current = 1;
        fetchPage(query, 1, false);
      }, 300),
    [fetchPage],
  );

  useEffect(() => {
    if (!active) {
      return;
    }

    searchRef.current = search;
    setResults([]);
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
    setLoading(true);
    fetchPage(searchRef.current, pageRef.current, true);
  }, [loading, hasMore, fetchPage]);

  return { results, loading, loadMore };
}
