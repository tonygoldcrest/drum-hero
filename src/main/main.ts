/* eslint global-require: off, no-console: off, promise/always-return: off */

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
import ini from 'ini';
import { app, BrowserWindow, shell, ipcMain, dialog, protocol } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { Midi } from '@tonejs/midi';
import Store from 'electron-store';
import { randomUUID } from 'crypto';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

const store = new Store();

ipcMain.on('electron-store-get', async (event, val) => {
  event.returnValue = store.get(val);
});
ipcMain.on('electron-store-set', async (event, key, val) => {
  store.set(key, val);
});

ipcMain.on('load-default', async (event) => {
  if (!mainWindow) {
    return;
  }

  const midiData = fs.readFileSync(
    '/Users/antosha/code/clone-hero-sheet/test-songs/yyz/notes.mid',
  );
  const midi = new Midi(midiData);
  event.reply('load-default', midi.toJSON());
});

ipcMain.on('load', async (event, [id]) => {
  if (!mainWindow) {
    return;
  }
  const song = store.get('songs')[id];
  glob(`${song.dir}/**/*.mid`, {}, (err, files) => {
    const midiData = fs.readFileSync(files[0]);
    const midi = new Midi(midiData);
    event.reply('load', { info: song, midi: midi.toJSON() });
  });
});

ipcMain.on('song-list', async (event) => {
  if (!mainWindow) {
    return;
  }
  event.reply('song-list', Object.values(store.get('songs')));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const loadSongList = async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Choose your Clone Hero library',
    message: 'Choose your Clone Hero library',
  });

  glob(`${result.filePaths[0]}/**/*.mid`, {}, (err, files) => {
    const songList = files
      .map((file) => path.join(path.dirname(file), 'song.ini'))
      .filter((file) => fs.existsSync(file))
      .map((file) => ({
        info: ini.parse(fs.readFileSync(file, 'utf-8')),
        dir: path.dirname(file),
      }))
      .map(({ info, dir }) => ({
        id: randomUUID(),
        song: info.song ?? info.Song ?? info,
        dir,
        albumCover: fs.existsSync(path.join(dir, 'album.png'))
          ? `atom:///${path.join(dir, 'album.png')}`
          : null,
      }));

    store.set(
      'songs',
      songList.reduce((acc, song) => {
        acc[song.id] = song;
        return acc;
      }, {}),
    );
  });
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  if (!store.get('songs')) {
    await loadSongList();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
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

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    protocol.registerFileProtocol('atom', (request, callback) => {
      const url = request.url.substr(7);
      callback({ path: url });
    });

    createWindow();
    // app.on('activate', () => {
    //   // On macOS it's common to re-create a window in the app when the
    //   // dock icon is clicked and there are no other windows open.
    //   if (mainWindow === null) createWindow();
    // });
  })
  .catch(console.log);
