import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Fuse from 'fuse.js';
import { IpcLoadSongListResponse, SongData } from '../../types';
import { SongFilter } from '../components/SongFilter';
import { SongList } from '../components/SongList';
import { SettingsButton } from '../components/SettingsButton';

export function SelectSongView() {
  const [songList, setSongList] = useState<SongData[]>([]);
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('load-song-list');
    window.electron.ipcRenderer.once<IpcLoadSongListResponse>(
      'load-song-list',
      (arg) => {
        setSongList(arg);
      },
    );
  }, []);

  window.electron.ipcRenderer.on<IpcLoadSongListResponse>(
    'rescan-songs',
    (arg) => {
      setSongList(arg);
    },
  );

  const filteredSongList = useMemo(() => {
    if (!nameFilter) {
      return songList.sort(
        (a, b) =>
          +(b.liked ?? 0) - +(a.liked ?? 0) || a.name.localeCompare(b.name),
      );
    }

    const fuseOptions = {
      keys: ['name', 'artist', 'charter'],
    };

    const fuse = new Fuse(songList, fuseOptions);

    return fuse.search(nameFilter).map((result) => result.item);
  }, [songList, nameFilter]);

  return (
    <div className="h-screen flex flex-col bg-bg">
      <div
        className="border-b border-divider p-5 z-10 flex gap-2"
        style={{ background: 'var(--gradient-header)' }}
      >
        <SongFilter
          nameFilter={nameFilter}
          onChange={(value: string) => {
            setNameFilter(value);
          }}
          filteredSongsCount={filteredSongList.length}
        />
        <SettingsButton />
      </div>
      <div className="w-full max-w-250 grow overflow-hidden mx-auto bg-bg">
        <SongList
          songList={filteredSongList}
          scrollKey={nameFilter}
          onLikeChange={(id, liked) => {
            const song = songList.find((s) => s.id === id);

            if (!song) {
              return;
            }
            window.electron.ipcRenderer.sendMessage('like-song', id, liked);

            setSongList([
              ...songList.filter((s) => s.id !== id),
              {
                ...song,
                liked,
              },
            ]);
          }}
        />
      </div>
      <div className="fixed inset-0 pointer-events-none z-100">
        <Outlet />
      </div>
    </div>
  );
}
