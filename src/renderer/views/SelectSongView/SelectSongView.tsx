import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Fuse from 'fuse.js';
import { SongListContainer, SongViewOverlay, Wrapper } from './styles';
import { IpcLoadSongListResponse, SongData } from '../../../types';
import { SongFilter } from '../../components/SongFilter/SongFilter';
import { SongList } from '../../components/SongList/SongList';

export function SelectSongView() {
  const [songList, setSongList] = useState<SongData[]>([]);
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('load-song-list');
    window.electron.ipcRenderer.on<IpcLoadSongListResponse>(
      'load-song-list',
      (arg) => {
        setSongList(arg);
      },
    );
  }, []);

  const filteredSongList = () => {
    if (!nameFilter) {
      return songList;
    }

    const fuseOptions = {
      // isCaseSensitive: false,
      // includeScore: false,
      // shouldSort: true,
      // includeMatches: false,
      // findAllMatches: false,
      // minMatchCharLength: 1,
      // location: 0,
      // threshold: 0.6,
      // distance: 100,
      // useExtendedSearch: false,
      // ignoreLocation: false,
      // ignoreFieldNorm: false,
      // fieldNormWeight: 1,
      keys: ['name', 'artist', 'charter'],
    };

    const fuse = new Fuse(songList, fuseOptions);

    return fuse.search(nameFilter).map((result) => result.item);
  };

  return (
    <Wrapper>
      <SongFilter
        nameFilter={nameFilter}
        onChange={(value: string) => {
          setNameFilter(value);
        }}
      />
      <SongListContainer>
        <SongList songList={filteredSongList()} />
      </SongListContainer>
      <SongViewOverlay>
        <Outlet />
      </SongViewOverlay>
    </Wrapper>
  );
}
