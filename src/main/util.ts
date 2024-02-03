/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';
import { dialog } from 'electron';
import { glob } from 'glob';
import fs from 'fs';
import ini from 'ini';
import ElectronStore from 'electron-store';
import { randomUUID } from 'crypto';

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

export async function parseAndSaveSongs(store: ElectronStore) {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Choose your Clone Hero library',
    message: 'Choose your Clone Hero library',
  });

  glob(`${result.filePaths[0]}/**/*.mid`, {}, (err, files) => {
    const songList = files
      .map((file) => path.join(path.dirname(file), 'song.ini'))
      .filter((file) => fs.existsSync(file))
      .map((file) => ({
        info: ini.parse(fs.readFileSync(file, 'utf-8')),
        dir: path.dirname(file),
      }))
      .map(({ info, dir }) => ({
        id: randomUUID(),
        dir,
        albumCover: fs.existsSync(path.join(dir, 'album.png'))
          ? `gh:///${path.join(dir, 'album.png')}`
          : null,
        ...(info.song ?? info.Song ?? info),
      }));

    store.set(
      'songs',
      songList.reduce((acc, song) => {
        acc[song.id] = song;
        return acc;
      }, {}),
    );
  });
}
