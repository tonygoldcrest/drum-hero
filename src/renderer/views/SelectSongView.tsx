import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Fuse from 'fuse.js';
import { IpcLoadSongListResponse, SongData } from '../../types';
import { SongFilter } from '../components/SongFilter';
import { SongList } from '../components/SongList';
import { SettingsButton } from '../components/SettingsButton';
import { useSettings } from '../context/SettingsContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faCog,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';

export function SelectSongView() {
  const [songList, setSongList] = useState<SongData[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const { setCurrentPath } = useSettings();

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('load-song-list');
    window.electron.ipcRenderer.once<IpcLoadSongListResponse>(
      'load-song-list',
      ({ songs, lastOpenedPath }) => {
        setSongList(songs);
        setCurrentPath(lastOpenedPath);
      },
    );
  }, [setCurrentPath]);

  window.electron.ipcRenderer.on<IpcLoadSongListResponse>(
    'rescan-songs',
    ({ songs, lastOpenedPath }) => {
      setSongList(songs);
      setCurrentPath(lastOpenedPath);
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
      <div className="w-full max-w-250 grow overflow-hidden mx-auto bg-bg flex flex-col">
        {songList.length > 0 ? (
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
        ) : (
          <div className="m-auto text-text-faint flex items-center gap-1 flex-col">
            <div>No songs found.</div>
            <div className="flex items-center gap-2">
              <div>Select a different folder</div>
              <div className="border-2 border-border py-1 px-2 rounded-md">
                <FontAwesomeIcon icon={faCog} />
              </div>
              <FontAwesomeIcon icon={faArrowRight} />
              <div className="flex items-center border-2 border-border py-1 px-2 rounded-md gap-1">
                <FontAwesomeIcon icon={faFolder} />
                <div>Select folder</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="fixed inset-0 pointer-events-none z-100">
        <Outlet />
      </div>
    </div>
  );
}
