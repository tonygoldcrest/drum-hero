import { StorageSchema } from '../../types';
import path from 'path';
import fs from 'fs';
import { appState } from '../AppState';

export function loadSong(event: Electron.IpcMainEvent, id: string) {
  const songData = (appState.store.get('songs') as StorageSchema['songs'])[id];
  const notesFile = path.join(
    songData.dir,
    songData.format === 'mid' ? 'notes.mid' : 'notes.chart',
  );
  const fileData = fs.readFileSync(notesFile);

  event.reply('load-song', { data: songData, fileData });
}
