/* eslint import/prefer-default-export: off */
import path from 'path';
import { dialog } from 'electron';
import { glob } from 'glob';
import fs from 'fs';
import ini from 'ini';
import ElectronStore from 'electron-store';
import { randomUUID } from 'crypto';
import { StorageSchema } from '../types';

export function resolveHtmlPath(_htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    return process.env['ELECTRON_RENDERER_URL']!;
  }
  return `file://${path.resolve(__dirname, '../renderer/index.html')}`;
}

export async function parseAndSaveSongs(
  store: ElectronStore,
  callback?: (songs: StorageSchema['songs']) => void,
) {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Choose your Clone Hero library',
    message: 'Choose your Clone Hero library',
  });

  if (result.canceled) {
    return;
  }

  store.delete('songs');

  glob(`${result.filePaths[0]}/**/notes.mid`, {}, (err, files) => {
    const supportedImageExtensions = ['png', 'jpg', 'jpeg'];

    const songList = files
      .map((file) => path.join(path.dirname(file), 'song.ini'))
      .filter((file) => fs.existsSync(file))
      .map((file) => ({
        info: ini.parse(fs.readFileSync(file, 'utf-8')),
        dir: path.dirname(file),
      }))
      .map(({ info, dir }) => {
        const albumCoverPath = supportedImageExtensions
          .map(ext => path.join(dir, `album.${ext}`))
          .find(p => fs.existsSync(p));

        return {
          id: randomUUID(),
          dir,
          albumCover: albumCoverPath ? `gh:///${albumCoverPath}` : null,
          ...(info.song ?? info.Song ?? info),
        };
      });

    const songs = songList.reduce((acc, song) => {
      acc[song.id] = song;
      return acc;
    }, {});
    store.set('songs', songs);

    callback?.(songs);
  });
}
