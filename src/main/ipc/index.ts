import Store from 'electron-store';
import { ipcMain, powerSaveBlocker } from 'electron';
import fs from 'fs';
import { parseAndSaveSongs } from '../util';
import { buildLoadSong } from './loadSong';
import { buildLoadSongList } from './loadSongList';
import { buildDownloadSong } from './downloadSong';

const store = new Store();

let powerSaveBlockerId: number = -1;

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

export function setupIpc() {
  ipcMain.on('load-song', buildLoadSong(store));

  ipcMain.on('load-song-list', buildLoadSongList(store));

  ipcMain.on('rescan-songs', async (event) => {
    await parseAndSaveSongs(store, (songs) => {
      const lastOpenedPath = store.get('lastOpenedPath') as string;
      event.reply('rescan-songs', {
        songs: Object.values(songs).map((s) => ({
          ...s,
          updatedAt: fs.statSync(s.dir).mtime.toISOString(),
        })),
        lastOpenedPath,
      });
    });
  });

  ipcMain.on('check-dev', async (event) => {
    event.reply('check-dev', isDebug);
  });

  ipcMain.on('like-song', async (event, id, liked) => {
    store.set(`songs.${id}.liked`, liked);
  });

  ipcMain.on('prevent-sleep', async () => {
    powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  });

  ipcMain.on('resume-sleep', async () => {
    powerSaveBlocker.stop(powerSaveBlockerId);
  });

  ipcMain.on('download-song', buildDownloadSong(store));
}
