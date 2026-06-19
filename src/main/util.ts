/* eslint import/prefer-default-export: off */
import path from 'path';
import { dialog } from 'electron';
import { glob } from 'glob';
import fs from 'fs';
import ini from 'ini';
import { randomUUID } from 'crypto';
import { AudioData, SongData, StorageSchema } from '../types';
import { appState } from './AppState';

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

export function buildSongFromDir(
  dir: string,
  existing?: { id?: string; liked?: boolean },
): SongData | null {
  const songIniPath = path.join(dir, 'song.ini');

  if (!fs.existsSync(songIniPath)) {
    return null;
  }

  const info = ini.parse(
    fs
      .readFileSync(songIniPath, 'utf-8')
      .replace(/<color=[^>]*>(.*?)<\/color>/g, '$1'),
  );
  const supportedImageExtensions = ['png', 'jpg', 'jpeg'];
  const albumCoverPath = supportedImageExtensions
    .map((ext) => path.join(dir, `album.${ext}`))
    .find((p) => fs.existsSync(p));
  const hasMid = fs.existsSync(path.join(dir, 'notes.mid'));
  const hasChart = fs.existsSync(path.join(dir, 'notes.chart'));

  if (!hasMid && !hasChart) {
    return null;
  }

  const format: 'mid' | 'chart' = hasMid ? 'mid' : 'chart';
  const audio: AudioData[] = fs
    .readdirSync(dir)
    .filter(
      (f) =>
        ['.ogg', '.opus', '.mp3'].includes(path.extname(f)) &&
        f !== 'crowd.ogg' &&
        f !== 'preview.ogg',
    )
    .map((f) => ({
      src: `gh://${path.join(dir, f)}`,
      name: path.parse(f).name,
    }));

  return {
    id: existing?.id ?? randomUUID(),
    dir,
    albumCover: albumCoverPath ? `gh://${albumCoverPath}` : null,
    ...(info.song ?? info.Song ?? info),
    format,
    audio,
    ...(existing?.liked !== undefined ? { liked: existing.liked } : {}),
  };
}

export async function parseAndSaveSongs(
  callback?: (songs: StorageSchema['songs']) => void,
) {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose your Clone Hero library',
    message: 'Choose your Clone Hero library',
  });

  if (result.canceled) {
    return;
  }

  const selectedPath = result.filePaths[0];

  appState.store.set('lastOpenedPath', selectedPath);

  const existingSongs =
    (appState.store.get('songs') as StorageSchema['songs']) ?? {};
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
    const dirToFile = new Map<string, string>();

    for (const file of files) {
      const dir = path.dirname(file);

      if (!dirToFile.has(dir) || path.extname(file) === '.mid') {
        dirToFile.set(dir, file);
      }
    }

    const songList = [...dirToFile.keys()]
      .map((dir) => buildSongFromDir(dir, existingByDir.get(dir)))
      .filter((s): s is SongData => s !== null);
    const rescannedSongs = songList.reduce(
      (acc, song) => {
        acc[song.id] = song;

        return acc;
      },
      {} as StorageSchema['songs'],
    );

    appState.store.set('songs', { ...otherSongs, ...rescannedSongs });
    callback?.(rescannedSongs);
  });
}
