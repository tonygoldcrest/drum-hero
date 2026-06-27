import fs from 'fs';
import { IpcDeleteStemToolsResponse } from '../../types';
import { getBundleDir } from '../stemTools';

export function deleteStemTools(event: Electron.IpcMainEvent) {
  try {
    fs.rmSync(getBundleDir(), { recursive: true, force: true });

    event.reply('delete-stem-tools', {
      success: true,
    } satisfies IpcDeleteStemToolsResponse);
  } catch (err) {
    event.reply('delete-stem-tools', {
      success: false,
      error: String(err),
    } satisfies IpcDeleteStemToolsResponse);
  }
}
