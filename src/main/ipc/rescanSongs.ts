import { IpcMainEvent, dialog } from 'electron';
import { SongData, StorageSchema } from '../../types';
import { appState } from '../AppState';
import { buildSongFromDir, isUnderDirectory } from '../util';
import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

export async function rescanSongs(event: IpcMainEvent, newDir = true) {
  let selectedPath: string;

  if (newDir) {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose your Clone Hero library',
      message: 'Choose your Clone Hero library',
    });

    if (result.canceled) {
      return;
    }

    selectedPath = result.filePaths[0];

    appState.store.set('lastOpenedPath', selectedPath);
  } else {
    selectedPath = appState.store.get('lastOpenedPath') as string;
  }

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
  const files = await glob(`${selectedPath}/**/{notes.mid,notes.chart}`);
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

  event.reply('rescan-songs', {
    songs: Object.values(rescannedSongs).map((s) => ({
      ...s,
      updatedAt: fs.statSync(s.dir).mtime.toISOString(),
    })),
    lastOpenedPath: selectedPath,
  });
}
