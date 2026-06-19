import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { app } from 'electron';

const REPO = 'tonygoldcrest/drum-hero-tools';

function getAssetName() {
  if (process.platform === 'darwin') {
    return 'demucs-split-mac-arm64.tar.gz';
  }

  return 'demucs-split-win-x64.zip';
}

export async function downloadStemTools(event: Electron.IpcMainEvent) {
  const assetName = getAssetName();
  const url = `https://github.com/${REPO}/releases/latest/download/${assetName}`;
  const destDir = path.join(app.getPath('userData'), 'stem-tools');
  const tmpPath = path.join(os.tmpdir(), assetName);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const contentLength = Number(response.headers.get('content-length')) || 0;
    const reader = response.body!.getReader();
    const fileStream = fs.createWriteStream(tmpPath);
    let downloaded = 0;
    let result = await reader.read();

    while (!result.done) {
      downloaded += result.value.length;
      fileStream.write(result.value);

      if (contentLength > 0) {
        event.reply('download-stem-tools', {
          progress: Math.round((downloaded / contentLength) * 90),
        });
      }

      result = await reader.read();
    }

    await new Promise<void>((resolve, reject) => {
      fileStream.close((err) => (err ? reject(err) : resolve()));
    });
    fs.mkdirSync(destDir, { recursive: true });
    event.reply('stem-tools-progress', 95);
    await new Promise<void>((resolve, reject) => {
      const proc =
        process.platform === 'win32'
          ? spawn('powershell.exe', [
              '-NoProfile',
              '-NonInteractive',
              '-Command',
              `Expand-Archive -Path '${tmpPath}' -DestinationPath '${destDir}' -Force`,
            ])
          : spawn('tar', ['-xzf', tmpPath, '-C', destDir]);

      proc.on('close', (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Extraction failed with code ${code}`)),
      );
    });
    fs.unlinkSync(tmpPath);
    event.reply('download-stem-tools', { success: true });
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // tmp file may not exist
    }

    event.reply('download-stem-tools', { success: false, error: String(err) });
  }
}
