import { useEffect, useMemo, useState } from 'react';
import { Spin } from 'antd';
import { useOnlineSearch } from '../hooks/useOnlineSearch';
import { Outlet } from 'react-router-dom';
import Fuse from 'fuse.js';
import { IpcLoadSongListResponse, SongData } from '../../types';
import { Mode, SongFilter } from '../components/SongFilter';
import { SongList } from '../components/SongList';
import { SettingsButton } from '../components/SettingsButton';
import { SortButton, type SortState } from '../components/SortButton';
import { useSettings } from '../context/SettingsContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faCog,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';

export function SelectSongView() {
  const [songList, setSongList] = useState<SongData[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [nameFilter, setNameFilter] = useState('');
  const [mode, setMode] = useState<Mode>('local');
  const [sort, setSort] = useState<SortState>({
    key: 'favorite',
    direction: 'asc',
  });

  const { results: onlineResults, loading: onlineLoading } = useOnlineSearch(
    mode === 'online',
    nameFilter,
  );

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
    if (mode === 'online') {
      return onlineResults;
    }

    if (nameFilter) {
      const fuse = new Fuse(songList, { keys: ['name', 'artist', 'charter'] });
      return fuse.search(nameFilter).map((result) => result.item);
    }

    return [...songList].sort((a, b) => {
      switch (sort.key) {
        case 'name': {
          const cmp = a.name.localeCompare(b.name);
          return sort.direction === 'asc' ? cmp : -cmp;
        }
        case 'favorite':
          return +(b.liked ?? 0) - +(a.liked ?? 0);
        case 'lastAdded': {
          const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return sort.direction === 'asc' ? at - bt : bt - at;
        }
        case 'difficulty': {
          const ad = parseInt(a.diff_drums ?? '-1');
          const bd = parseInt(b.diff_drums ?? '-1');
          return sort.direction === 'asc' ? ad - bd : bd - ad;
        }
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [songList, nameFilter, mode, onlineResults, sort]);

  return (
    <div className="h-screen flex flex-col bg-bg">
      <div
        className="border-b border-divider p-5 z-10 flex gap-2 items-center"
        style={{ background: 'var(--gradient-header)' }}
      >
        <SongFilter
          nameFilter={nameFilter}
          onChangeFilter={(value: string) => {
            setNameFilter(value);
          }}
          filteredSongsCount={filteredSongList.length}
          mode={mode}
          onChangeMode={setMode}
        />
        {mode !== 'online' && <SortButton sort={sort} onSortChange={setSort} />}
        <SettingsButton />
      </div>
      <div className="relative grow overflow-hidden w-full flex">
        <div className="relative w-full max-w-250 grow overflow-hidden mx-auto bg-bg flex flex-col">
          {filteredSongList.length > 0 ||
          (mode === 'online' && onlineLoading) ? (
            <SongList
              songList={filteredSongList}
              scrollKey={nameFilter}
              downloadingIds={downloadingIds}
              mode={mode}
              downloadedIds={
                mode === 'online'
                  ? new Set(songList.map((s) => s.id))
                  : undefined
              }
              onDownload={(id) => {
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
                    setSongList((prev) => [...prev, newSong]);
                  } else {
                    console.error('Download failed:', error);
                  }
                });
              }}
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
              {mode !== 'online' && (
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
              )}
            </div>
          )}
        </div>

        {mode === 'online' && onlineLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-10">
            <Spin />
          </div>
        )}
      </div>

      <div className="fixed inset-0 pointer-events-none z-100">
        <Outlet />
      </div>
    </div>
  );
}
