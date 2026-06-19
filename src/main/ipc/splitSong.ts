import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { StorageSchema } from '../../types';
import { appState } from '../AppState';
import { buildSongFromDir } from '../util';

const queue: Array<{ event: Electron.IpcMainEvent; id: string }> = [];
let processing = false;
let activeProc: ReturnType<typeof spawn> | null = null;
let activeId: string | null = null;

export function cancelSplit(_event: Electron.IpcMainEvent, id: string) {
  if (activeId === id && activeProc) {
    activeProc.kill();
    return;
  }

  const idx = queue.findIndex((item) => item.id === id);

  if (idx !== -1) {
    const [removed] = queue.splice(idx, 1);

    removed.event.reply('split-song', {
      id,
      success: false,
      error: 'Cancelled',
    });
  }
}

function getBinaryPath() {
  const binaryName =
    process.platform === 'win32' ? 'demucs-split.exe' : 'demucs-split';
  return path.join(
    app.getPath('userData'),
    'stem-tools',
    'demucs-split',
    binaryName,
  );
}

async function doSplit(event: Electron.IpcMainEvent, id: string) {
  const songs = appState.store.get('songs') as StorageSchema['songs'];
  const songData = songs[id];

  if (!songData || songData.audio.length === 0) {
    event.reply('split-song', {
      id,
      success: false,
      error: 'No audio file found',
    });
    return;
  }

  const audioPath = songData.audio[0].src.replace(/^gh:\/\//, '');
  const audioFilename = path.basename(audioPath);
  const audioBasename = path.parse(audioFilename).name;

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        getBinaryPath(),
        ['--two-stems=drums', '-o', './stems', audioFilename],
        { cwd: songData.dir },
      );
      activeProc = proc;
      activeId = id;

      const stderr: string[] = [];

      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr.push(text);
        const match = text.match(/(\d+)%\|/);

        if (match) {
          event.reply('split-song', { id, progress: parseInt(match[1]) });
        }
      });

      proc.on('close', (code, signal) => {
        activeProc = null;
        activeId = null;

        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          reject(new Error('Cancelled'));
        } else if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `demucs-split exited with code ${code}: ${stderr.join('')}`,
            ),
          );
        }
      });
    });

    const stemOutputDir = path.join(
      songData.dir,
      'stems',
      'htdemucs',
      audioBasename,
    );

    for (const file of fs.readdirSync(stemOutputDir)) {
      const destName = file === 'no_drums.mp3' ? 'song.mp3' : file;

      fs.renameSync(
        path.join(stemOutputDir, file),
        path.join(songData.dir, destName),
      );
    }

    fs.rmSync(path.join(songData.dir, 'stems'), { recursive: true });
    fs.unlinkSync(audioPath);

    const updatedSong = buildSongFromDir(songData.dir, {
      id,
      liked: songData.liked,
    });
    if (!updatedSong) {
      throw new Error('Failed to rebuild song after splitting');
    }

    appState.store.set(`songs.${id}`, updatedSong);
    event.reply('split-song', { id, success: true, song: updatedSong });
  } catch (err) {
    event.reply('split-song', { id, success: false, error: String(err) });
  }
}

async function processNext() {
  if (processing || queue.length === 0) {
    return;
  }
  processing = true;
  const item = queue.shift()!;
  await doSplit(item.event, item.id);
  processing = false;
  processNext();
}

export function splitSong(event: Electron.IpcMainEvent, id: string) {
  queue.push({ event, id });
  processNext();
}
