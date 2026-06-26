import { mkdtempSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { _electron as electron, ElectronApplication } from '@playwright/test';
import {
  buildDrumMidi,
  GEM,
  hit,
} from '../src/renderer/components/SheetMusic/drumMidiFixture';

const MAIN_ENTRY = path.join(__dirname, '..', 'out', 'main', 'index.js');

export interface Harness {
  app: ElectronApplication;
  libraryDir: string;
}

const ALBUM_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

function writeFixtureLibrary(): string {
  const libraryDir = mkdtempSync(path.join(tmpdir(), 'sightkick-library-'));
  const songDir = path.join(libraryDir, 'test-song');

  mkdirSync(songDir, { recursive: true });

  writeFileSync(path.join(songDir, 'album.png'), ALBUM_PNG);

  writeFileSync(
    path.join(songDir, 'song.ini'),
    [
      '[song]',
      'name = Master of Puppets',
      'artist = Metallica',
      'charter = Test Charter',
      'pro_drums = True',
      'five_lane_drums = False',
      'diff_drums = 4',
      '',
    ].join('\n'),
  );

  const midi = buildDrumMidi([
    {
      hits: [
        hit(GEM.kick, 0),
        hit(GEM.snare, 480),
        hit(GEM.kick, 960),
        hit(GEM.snare, 1440),
      ],
    },
    {
      hits: [
        hit(GEM.kick, 0),
        hit(GEM.yellow, 480),
        hit(GEM.kick, 960),
        hit(GEM.snare, 1440),
      ],
    },
  ]);

  writeFileSync(path.join(songDir, 'notes.mid'), midi);

  return libraryDir;
}

function seedUserData(seed: Record<string, unknown>): string {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'sightkick-userdata-'));

  writeFileSync(
    path.join(userDataDir, 'config.json'),
    JSON.stringify(seed, undefined, 2),
  );

  return userDataDir;
}

export async function launchApp(
  options: { seedLibrary?: boolean } = {},
): Promise<Harness> {
  const libraryDir = writeFixtureLibrary();
  const userDataDir = seedUserData(
    options.seedLibrary ? { lastOpenedPath: libraryDir } : {},
  );
  const app = await electron.launch({
    args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      START_MINIMIZED: '1',
    },
  });

  return { app, libraryDir };
}
