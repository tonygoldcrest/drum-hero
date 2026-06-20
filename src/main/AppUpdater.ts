import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { Notification, shell } from 'electron';

const RELEASES_URL =
  'https://github.com/tonygoldcrest/sightkick/releases/latest';

export class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.autoDownload = false;
    autoUpdater.on('update-available', (info) => {
      const notification = new Notification({
        title: 'SightKick Update Available',
        body: `Version ${info.version} is available. Click to download.`,
      });

      notification.on('click', () => shell.openExternal(RELEASES_URL));
      notification.show();
    });
    autoUpdater
      .checkForUpdates()
      .catch((err) => log.warn('Update check failed:', err));
  }
}
