/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import glob from 'glob';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  protocol,
  net,
  powerSaveBlocker,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import Store from 'electron-store';
import MenuBuilder from './menu';
import { isUnderDirectory, parseAndSaveSongs, resolveHtmlPath } from './util';
import { StorageSchema } from '../types';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

const store = new Store();

let powerSaveBlockerId: number = -1;

ipcMain.on('load-song', async (event, id) => {
  const songData = (store.get('songs') as StorageSchema['songs'])[id];

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
});

ipcMain.on('load-song-list', async (event) => {
  const lastOpenedPath = store.get('lastOpenedPath') as string | undefined;

  if (!lastOpenedPath || !fs.existsSync(lastOpenedPath)) {
    event.reply('load-song-list', { songs: [], lastOpenedPath: null });
    return;
  }

  const allSongs = store.get('songs') as StorageSchema['songs'] | undefined;
  const songs = allSongs
    ? Object.values(allSongs).filter((s) =>
        isUnderDirectory(s.dir, lastOpenedPath),
      )
    : [];
  event.reply('load-song-list', { songs, lastOpenedPath });
});

ipcMain.on('rescan-songs', async (event) => {
  await parseAndSaveSongs(store, (songs) => {
    const lastOpenedPath = store.get('lastOpenedPath') as string;
    event.reply('rescan-songs', {
      songs: Object.values(songs),
      lastOpenedPath,
    });
  });
});

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

ipcMain.on('check-dev', async (event) => {
  event.reply('check-dev', isDebug);
});

ipcMain.on('like-song', async (event, id, liked) => {
  store.set(`songs.${id}.liked`, liked);
});

ipcMain.on('prevent-sleep', async () => {
  powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
});

ipcMain.on('resume-sleep', async () => {
  powerSaveBlocker.stop(powerSaveBlockerId);
});

if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (isDebug) {
  // require('electron-debug')();
}

const createWindow = async () => {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    x: 0,
    y: 0,
    width: 1366,
    height: 768,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

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

app
  .whenReady()
  .then(() => {
    protocol.handle('gh', (request) => {
      // URLs are gh://<absolutePath> where <absolutePath> starts with "/".
      // Strip the scheme and any leading slashes back down to a single one.
      const filePath = decodeURIComponent(request.url.replace(/^gh:\/+/, '/'));
      return net.fetch(pathToFileURL(filePath).toString());
    });

    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) {
        createWindow();
      }
    });
  })
  .catch(console.log);
