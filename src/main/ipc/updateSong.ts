import { IpcUpdateSongPayload, StorageSchema } from '../../types';
import { appState } from '../AppState';

export function updateSong(
  event: Electron.IpcMainEvent,
  payload: IpcUpdateSongPayload,
) {
  const { id, ...update } = payload;
  const songs = appState.store.get('songs') as StorageSchema['songs'];
  const prev = songs[id];
  const next = {
    ...prev,
    ...update,
    scoreData: { ...prev.scoreData, ...update.scoreData },
  };

  appState.store.set(`songs.${id}`, next);
  event.reply('update-song', next);
}
