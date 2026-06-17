import Store from 'electron-store';
import fs from 'fs';
import { StorageSchema } from '../../types';
import { isUnderDirectory } from '../util';

export function buildLoadSongList(store: Store) {
  return async (event: Electron.IpcMainEvent) => {
    const lastOpenedPath = store.get('lastOpenedPath') as string | undefined;

    if (!lastOpenedPath || !fs.existsSync(lastOpenedPath)) {
      event.reply('load-song-list', { songs: [], lastOpenedPath: null });
      return;
    }

    const allSongs = store.get('songs') as StorageSchema['songs'] | undefined;
    const songs = allSongs
      ? Object.values(allSongs)
          .filter((s) => isUnderDirectory(s.dir, lastOpenedPath))
          .map((s) => ({
            ...s,
            updatedAt: fs.statSync(s.dir).mtime.toISOString(),
          }))
      : [];
    event.reply('load-song-list', { songs, lastOpenedPath });
  };
}
