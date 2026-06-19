import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { StemToolsStatus } from '../../types';

function isSupported(): boolean {
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    return true;
  }

  if (process.platform === 'win32') {
    return true;
  }

  return false;
}

export function checkStemTools(event: Electron.IpcMainEvent) {
  if (!isSupported()) {
    event.reply('check-stem-tools', 'unsupported' satisfies StemToolsStatus);
    return;
  }

  const binaryName =
    process.platform === 'win32' ? 'demucs-split.exe' : 'demucs-split';

  const binaryPath = path.join(
    app.getPath('userData'),
    'stem-tools',
    'demucs-split',
    binaryName,
  );

  const status: StemToolsStatus = fs.existsSync(binaryPath)
    ? 'ready'
    : 'download';
  event.reply('check-stem-tools', status);
}
