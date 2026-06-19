import { useCallback, useEffect, useState } from 'react';
import { AudioData, IpcLoadSongResponse, SongData } from '../../types';
import { TrackConfig } from '../services/audio-player/types';

interface SongLoaderResult {
  fileData: Buffer | undefined;
  format: 'mid' | 'chart';
  songData: SongData | null;
  trackData: TrackConfig[];
}

export function useSongLoader(id: string | undefined): SongLoaderResult {
  const [fileData, setFileData] = useState<Buffer>();
  const [format, setFormat] = useState<'mid' | 'chart'>('mid');
  const [songData, setSongData] = useState<SongData | null>(null);
  const [trackData, setTrackData] = useState<TrackConfig[]>([]);
  const loadSong = useCallback(() => {
    window.electron.ipcRenderer.once<IpcLoadSongResponse>(
      'load-song',
      ({ data, fileData: fd }) => {
        setFileData(fd);
        setFormat(data.format);
        setSongData(data);

        const drums = data.audio
          .filter((file: AudioData) => file.name.includes('drums'))
          .map((file: AudioData) => file.src);
        const other = data.audio
          .filter((file: AudioData) => !file.name.includes('drums'))
          .map((file: AudioData) => ({ urls: [file.src], name: file.name }));

        setTrackData([
          ...(drums.length ? [{ name: 'drums', urls: drums }] : []),
          ...other,
        ]);
      },
    );
    window.electron.ipcRenderer.sendMessage('load-song', id);
  }, [id]);

  useEffect(() => {
    loadSong();
  }, [loadSong]);

  return { fileData, format, songData, trackData };
}
