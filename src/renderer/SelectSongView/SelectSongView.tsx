import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SongList } from '../SongList/SongList';
import { SongData } from '../types';
import { Wrapper } from './styles';

export function SelectSongView() {
  const [songList, setSongList] = useState<SongData[]>([]);

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('song-list', ['ping']);
    window.electron.ipcRenderer.on('song-list', (arg) => {
      setSongList(arg as SongData[]);
    });
  }, []);

  return (
    <Wrapper>
      <SongList songList={songList} />
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <Outlet />
      </div>
    </Wrapper>
  );
}
