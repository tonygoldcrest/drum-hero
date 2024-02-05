import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Fuse from 'fuse.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderTree } from '@fortawesome/free-solid-svg-icons';
import {
  Header,
  ScanSongsButton,
  SongListContainer,
  SongViewOverlay,
  Wrapper,
} from './styles';
import { IpcLoadSongListResponse, SongData } from '../../../types';
import { SongFilter } from '../../components/SongFilter/SongFilter';
import { SongList } from '../../components/SongList/SongList';

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
    <Wrapper>
      <Header>
        <SongFilter
          nameFilter={nameFilter}
          onChange={(value: string) => {
            setNameFilter(value);
          }}
        />
      </Header>
      <SongListContainer>
        <SongList
          songList={filteredSongList}
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
      </SongListContainer>
      <SongViewOverlay>
        <Outlet />
      </SongViewOverlay>
      <ScanSongsButton
        tooltip="Rescan songs"
        type="primary"
        icon={<FontAwesomeIcon icon={faFolderTree} />}
        onClick={() => {
          window.electron.ipcRenderer.sendMessage('rescan-songs');
          window.electron.ipcRenderer.once<IpcLoadSongListResponse>(
            'rescan-songs',
            (arg) => {
              setSongList(arg);
            },
          );
        }}
      />
    </Wrapper>
  );
}
