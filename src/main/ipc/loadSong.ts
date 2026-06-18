import { StorageSchema } from '../../types';
import glob from 'glob';
import path from 'path';
import fs from 'fs';
import { appState } from '../AppState';

export async function loadSong(event: Electron.IpcMainEvent, id: string) {
  const songData = (appState.store.get('songs') as StorageSchema['songs'])[id];

  glob(
    `${songData.dir}/*(*.mid|*.chart|*.ogg|*.opus)`,
    { ignore: [`${songData.dir}/crowd.ogg`, `${songData.dir}/preview.ogg`] },
    (err, files) => {
      const midiFilePath = files.find((file) => path.extname(file) === '.mid');
      const chartFilePath = files.find(
        (file) => path.extname(file) === '.chart',
      );

      if (!midiFilePath && !chartFilePath) {
        return;
      }

      const audio = files
        .filter((file) => ['.ogg', '.opus'].includes(path.extname(file)))
        .map((file) => ({
          src: `gh://${file}`,
          name: path.parse(file).name,
        }));

      const format = midiFilePath ? 'mid' : 'chart';
      const fileData = fs.readFileSync(midiFilePath ?? chartFilePath!);

      event.reply('load-song', { data: songData, fileData, format, audio });
    },
  );
}
