import { useEffect, useMemo, useRef, useState } from 'react';
import { debounce, uniqBy } from 'es-toolkit';
import { SongData } from '../../types';

export function useOnlineSearch(active: boolean, search: string) {
  const [results, setResults] = useState<SongData[]>([]);
  const [loading, setLoading] = useState(false);

  const cache = useRef<Map<string, SongData[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const debouncedFetch = useMemo(
    () =>
      debounce((query: string) => {
        abortRef.current?.abort();

        if (cache.current.has(query)) {
          setResults(cache.current.get(query)!);
          setLoading(false);
          return;
        }

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
            page: 1,
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
            cache.current.set(query, songs);

            setResults(songs);
            setLoading(false);
          })
          .catch((err) => {
            if (controller.signal.aborted) {
              return;
            }
            console.error('Encore fetch error:', err);
            setLoading(false);
          });
      }, 300),
    [],
  );

  useEffect(() => {
    if (!active) {
      return;
    }

    setLoading(true);
    debouncedFetch(search);

    return () => {
      debouncedFetch.cancel();
      abortRef.current?.abort();
      setLoading(false);
    };
  }, [active, search, debouncedFetch]);

  return { results, loading };
}
