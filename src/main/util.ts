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

export function isUnderDirectory(songDir: string, rootDir: string): boolean {
  const relative = path.relative(rootDir, songDir);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
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

  const selectedPath = result.filePaths[0];
  store.set('lastOpenedPath', selectedPath);

  const existingSongs = (store.get('songs') as StorageSchema['songs']) ?? {};

  const existingByDir = new Map<string, StorageSchema['songs'][string]>();

  for (const song of Object.values(existingSongs)) {
    if (isUnderDirectory(song.dir, selectedPath)) {
      existingByDir.set(song.dir, song);
    }
  }

  const otherSongs = Object.fromEntries(
    Object.entries(existingSongs).filter(
      ([, s]) => !isUnderDirectory(s.dir, selectedPath),
    ),
  );

  glob(`${selectedPath}/**/{notes.mid,notes.chart}`, {}, (err, files) => {
    const supportedImageExtensions = ['png', 'jpg', 'jpeg'];

    const dirToFile = new Map<string, string>();

    for (const file of files) {
      const dir = path.dirname(file);
      if (!dirToFile.has(dir) || path.extname(file) === '.mid') {
        dirToFile.set(dir, file);
      }
    }

    const songList = [...dirToFile.keys()]
      .map((dir) => path.join(dir, 'song.ini'))
      .filter((file) => fs.existsSync(file))
      .map((file) => ({
        info: ini.parse(
          fs
            .readFileSync(file, 'utf-8')
            .replace(/<color=[^>]*>(.*?)<\/color>/g, '$1'),
        ),
        dir: path.dirname(file),
      }))
      .map(({ info, dir }) => {
        const albumCoverPath = supportedImageExtensions
          .map((ext) => path.join(dir, `album.${ext}`))
          .find((p) => fs.existsSync(p));

        const existing = existingByDir.get(dir);

        return {
          id: existing?.id ?? randomUUID(),
          dir,
          albumCover: albumCoverPath ? `gh://${albumCoverPath}` : null,
          ...(info.song ?? info.Song ?? info),
          // Preserve user data from existing entry
          ...(existing?.liked !== undefined ? { liked: existing.liked } : {}),
        };
      });

    const rescannedSongs = songList.reduce(
      (acc, song) => {
        acc[song.id] = song;
        return acc;
      },
      {} as StorageSchema['songs'],
    );

    store.set('songs', { ...otherSongs, ...rescannedSongs });

    callback?.(rescannedSongs);
  });
}
