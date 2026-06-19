import path from 'path';
import { pathToFileURL } from 'url';
import {
  app,
  BrowserWindow,
  ipcMain,
  net,
  protocol,
  shell,
  powerSaveBlocker,
} from 'electron';
import Store from 'electron-store';
import fs from 'fs';
import MenuBuilder from './menu';
import { resolveHtmlPath, parseAndSaveSongs } from './util';
import { AppUpdater } from './AppUpdater';
import { loadSong } from './ipc/loadSong';
import { loadSongList } from './ipc/loadSongList';
import { downloadSong } from './ipc/downloadSong';
import { checkStemTools } from './ipc/checkStemTools';
import { downloadStemTools } from './ipc/downloadStemTools';
import { splitSong, cancelSplit } from './ipc/splitSong';

class AppState {
  private static instance: AppState;
  private mainWindow: BrowserWindow | null = null;
  private powerSaveBlockerId: number = -1;
  readonly store = new Store();

  static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

  start(): void {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: 'gh',
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: true,
          corsEnabled: true,
          stream: true,
        },
      },
    ]);

    app.on('window-all-closed', () => {
      this.cleanup();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app
      .whenReady()
      .then(() => {
        protocol.handle('gh', (request) => {
          // URLs are gh://<absolutePath> where <absolutePath> starts with "/".
          // Strip the scheme and any leading slashes back down to a single one.
          const filePath = decodeURIComponent(
            request.url.replace(/^gh:\/+/, '/'),
          );
          return net.fetch(pathToFileURL(filePath).toString());
        });

        this.setupIpc();
        this.createWindow();

        app.on('activate', () => {
          if (!this.mainWindow) {
            this.createWindow();
          }
        });
      })
      .catch(console.log);
  }

  private setupIpc(): void {
    const isDebug =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true';

    ipcMain.on('load-song', loadSong);
    ipcMain.on('load-song-list', loadSongList);
    ipcMain.on('download-song', downloadSong);
    ipcMain.on('check-stem-tools', checkStemTools);
    ipcMain.on('download-stem-tools', downloadStemTools);
    ipcMain.on('split-song', splitSong);
    ipcMain.on('cancel-split', cancelSplit);

    ipcMain.on('rescan-songs', async (event) => {
      await parseAndSaveSongs((songs) => {
        const lastOpenedPath = this.store.get('lastOpenedPath') as string;
        event.reply('rescan-songs', {
          songs: Object.values(songs).map((s) => ({
            ...s,
            updatedAt: fs.statSync(s.dir).mtime.toISOString(),
          })),
          lastOpenedPath,
        });
      });
    });

    ipcMain.on('check-dev', (event) => {
      event.reply('check-dev', isDebug);
    });

    ipcMain.on('like-song', (event, id, liked) => {
      this.store.set(`songs.${id}.liked`, liked);
    });

    ipcMain.on('prevent-sleep', () => this.preventSleep());
    ipcMain.on('resume-sleep', () => this.resumeSleep());
  }

  async createWindow(): Promise<void> {
    const RESOURCES_PATH = app.isPackaged
      ? path.join(process.resourcesPath, 'assets')
      : path.join(__dirname, '../../assets');

    const getAssetPath = (...paths: string[]): string => {
      return path.join(RESOURCES_PATH, ...paths);
    };

    this.mainWindow = new BrowserWindow({
      show: false,
      x: 0,
      y: 0,
      width: 1366,
      height: 768,
      icon:
        process.platform === 'win32'
          ? getAssetPath('icon.ico')
          : process.platform === 'linux'
          ? getAssetPath('icons', '512x512.png')
          : getAssetPath('icon.png'),
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
      },
    });

    this.mainWindow.loadURL(resolveHtmlPath('index.html'));

    this.mainWindow.on('ready-to-show', () => {
      if (!this.mainWindow) {
        throw new Error('"mainWindow" is not defined');
      }
      if (process.env.START_MINIMIZED) {
        this.mainWindow.minimize();
      } else {
        this.mainWindow.maximize();
        this.mainWindow.show();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    const menuBuilder = new MenuBuilder(this.mainWindow);
    menuBuilder.buildMenu();

    this.mainWindow.webContents.setWindowOpenHandler((edata) => {
      shell.openExternal(edata.url);
      return { action: 'deny' };
    });

    new AppUpdater();
  }

  preventSleep(): void {
    if (this.powerSaveBlockerId === -1) {
      this.powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    }
  }

  resumeSleep(): void {
    if (this.powerSaveBlockerId !== -1) {
      powerSaveBlocker.stop(this.powerSaveBlockerId);
      this.powerSaveBlockerId = -1;
    }
  }

  cleanup(): void {
    this.resumeSleep();
  }
}

export const appState = AppState.getInstance();
