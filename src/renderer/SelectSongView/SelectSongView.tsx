import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Fuse from 'fuse.js';
import { SongList } from '../SongList/SongList';
import { SongData } from '../types';
import { SongListContainer, SongViewOverlay, Wrapper } from './styles';
import { SelectSongHeader } from '../SelectSongHeader/SelectSongHeader';

export function SelectSongView() {
  const [songList, setSongList] = useState<SongData[]>([]);
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('song-list', ['ping']);
    window.electron.ipcRenderer.on('song-list', (arg) => {
      setSongList(arg as SongData[]);
    });
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
      keys: ['song.name', 'song.artist'],
    };

    const fuse = new Fuse(songList, fuseOptions);

    return fuse.search(nameFilter).map((result) => result.item);
  };

  return (
    <Wrapper>
      <SelectSongHeader
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
