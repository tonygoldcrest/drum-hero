import { useCallback, useState } from 'react';
import { SongData } from '../../types';

export function useDownload(
  onlineResults: SongData[],
  onSongAdded: (song: SongData) => void,
) {
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const handleDownload = useCallback(
    (id: string) => {
      const song = onlineResults.find((s) => s.id === id);

      if (!song || downloadingIds.has(id)) {
        return;
      }

      setDownloadingIds((prev) => new Set(prev).add(id));
      window.electron.ipcRenderer.sendMessage('download-song', {
        url: song.dir,
        md5: song.id,
        name: song.name,
        artist: song.artist,
        charter: song.charter,
      });
      window.electron.ipcRenderer.once<{
        success: boolean;
        song?: SongData;
        error?: string;
      }>('download-song', ({ success, song: newSong, error }) => {
        setDownloadingIds((prev) => {
          const next = new Set(prev);

          next.delete(id);

          return next;
        });

        if (success && newSong) {
          onSongAdded(newSong);
        } else {
          console.error('Download failed:', error);
        }
      });
    },
    [onlineResults, downloadingIds, onSongAdded],
  );

  return { downloadingIds, handleDownload };
}
