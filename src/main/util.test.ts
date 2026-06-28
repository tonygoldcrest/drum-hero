import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assetUrlToFilePath,
  buildSongFromDir,
  chartGlobPattern,
  isUnderDirectory,
  resolveHtmlPath,
  toAssetUrl,
} from './util';

const CHART_WITH_HARD_AND_EXPERT = `[Song]
{
  Resolution = 192
}
[SyncTrack]
{
  0 = TS 4
  0 = B 120000
}
[ExpertDrums]
{
  0 = N 0 0
  0 = N 1 0
  192 = N 2 0
}
[HardDrums]
{
  0 = N 0 0
  192 = N 1 0
}
`;
const CHART_WITHOUT_DRUMS = `[Song]
{
  Resolution = 192
}
[SyncTrack]
{
  0 = TS 4
  0 = B 120000
}
[ExpertSingle]
{
  0 = N 0 0
}
`;
let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'song-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function writeSong(
  chart: string,
  ini = '[Song]\nname = Test\npro_drums = True\n',
) {
  fs.writeFileSync(path.join(dir, 'song.ini'), ini);
  fs.writeFileSync(path.join(dir, 'notes.chart'), chart);
}

describe('buildSongFromDir drum difficulties', () => {
  it('extracts the charted drum difficulties in easy→expert order', () => {
    writeSong(CHART_WITH_HARD_AND_EXPERT);

    const song = buildSongFromDir(dir);

    expect(song?.drumDifficulties).toEqual(['hard', 'expert']);
  });

  it('returns an empty list when no drums are charted', () => {
    writeSong(CHART_WITHOUT_DRUMS);

    const song = buildSongFromDir(dir);

    expect(song?.drumDifficulties).toEqual([]);
  });

  it('returns an empty list when the chart fails to parse', () => {
    fs.writeFileSync(
      path.join(dir, 'song.ini'),
      '[Song]\nname = Test\npro_drums = True\n',
    );
    fs.writeFileSync(path.join(dir, 'notes.mid'), 'not a real midi file');

    const song = buildSongFromDir(dir);

    expect(song?.drumDifficulties).toEqual([]);
    expect(song?.format).toBe('mid');
  });

  it('reuses existing drum difficulties without reparsing the chart', () => {
    writeSong(CHART_WITHOUT_DRUMS);

    const song = buildSongFromDir(dir, {
      drumDifficulties: ['expert'],
    });

    expect(song?.drumDifficulties).toEqual(['expert']);
  });

  it('reparses when existing drum difficulties are empty', () => {
    writeSong(CHART_WITH_HARD_AND_EXPERT);

    const song = buildSongFromDir(dir, {
      drumDifficulties: [],
    });

    expect(song?.drumDifficulties).toEqual(['hard', 'expert']);
  });
});

describe('buildSongFromDir guards', () => {
  it('returns null when there is no song.ini', () => {
    expect(buildSongFromDir(dir)).toBeNull();
  });

  it('returns null when neither notes.mid nor notes.chart exists', () => {
    fs.writeFileSync(path.join(dir, 'song.ini'), '[Song]\nname = Test\n');

    expect(buildSongFromDir(dir)).toBeNull();
  });
});

describe('buildSongFromDir metadata', () => {
  it('keeps crowd stems and skips preview tracks in any format', () => {
    writeSong(CHART_WITH_HARD_AND_EXPERT);
    fs.writeFileSync(path.join(dir, 'drums.ogg'), '');
    fs.writeFileSync(path.join(dir, 'song.mp3'), '');
    fs.writeFileSync(path.join(dir, 'crowd.ogg'), '');
    fs.writeFileSync(path.join(dir, 'crowd.opus'), '');
    fs.writeFileSync(path.join(dir, 'preview.ogg'), '');
    fs.writeFileSync(path.join(dir, 'preview.opus'), '');
    fs.writeFileSync(path.join(dir, 'preview.mp3'), '');

    const song = buildSongFromDir(dir);
    const names = song?.audio.map((a) => a.name).sort();

    expect(names).toEqual(['crowd', 'crowd', 'drums', 'song']);
    expect(song?.audio.every((a) => a.src.startsWith('sightkick://'))).toBe(
      true,
    );
  });

  it('detects the album cover and carries existing persisted fields', () => {
    writeSong(CHART_WITH_HARD_AND_EXPERT);
    fs.writeFileSync(path.join(dir, 'album.jpg'), '');

    const song = buildSongFromDir(dir, {
      id: 'fixed-id',
      liked: true,
      scoreData: { expert: { score: 10 } } as never,
    });

    expect(song?.id).toBe('fixed-id');
    expect(song?.liked).toBe(true);
    expect(song?.scoreData).toEqual({ expert: { score: 10 } });
    expect(song?.albumCover).toBe(toAssetUrl(path.join(dir, 'album.jpg')));
  });

  it('reports no album cover when no image is present', () => {
    writeSong(CHART_WITH_HARD_AND_EXPERT);

    expect(buildSongFromDir(dir)?.albumCover).toBeNull();
  });
});

describe('chartGlobPattern', () => {
  it('keeps forward-slash roots intact', () => {
    expect(chartGlobPattern('/songs/rock')).toBe(
      '/songs/rock/**/{notes.mid,notes.chart}',
    );
  });

  it('converts Windows backslash roots to forward slashes', () => {
    expect(chartGlobPattern('D:\\a\\sightkick\\library')).toBe(
      'D:/a/sightkick/library/**/{notes.mid,notes.chart}',
    );
  });
});

describe('sightkick:// urls', () => {
  const POSIX = '/songs/My Song/drums.ogg';
  const WINDOWS = 'C:\\Users\\me\\My Song\\drums.ogg';

  it('fully percent-encodes the absolute path behind a host', () => {
    expect(toAssetUrl(POSIX)).toBe(
      'sightkick://local/%2Fsongs%2FMy%20Song%2Fdrums.ogg',
    );
    expect(toAssetUrl(WINDOWS)).toBe(
      'sightkick://local/C%3A%5CUsers%5Cme%5CMy%20Song%5Cdrums.ogg',
    );
  });

  it('round-trips through browser url canonicalization', () => {
    for (const original of [POSIX, WINDOWS]) {
      const canonical = new URL(toAssetUrl(original)).href;

      expect(canonical).toBe(toAssetUrl(original));
      expect(assetUrlToFilePath(canonical)).toBe(original);
    }
  });
});

describe('isUnderDirectory', () => {
  it('accepts a directory nested inside the root', () => {
    expect(isUnderDirectory('/songs/rock/track', '/songs')).toBe(true);
  });

  it('accepts the root directory itself', () => {
    expect(isUnderDirectory('/songs', '/songs')).toBe(true);
  });

  it('rejects a sibling escaping via ..', () => {
    expect(isUnderDirectory('/other/track', '/songs')).toBe(false);
  });
});

describe('resolveHtmlPath', () => {
  const original = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = original;
  });

  it('uses the dev renderer URL in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.ELECTRON_RENDERER_URL = 'http://localhost:1234';

    expect(resolveHtmlPath('index.html')).toBe('http://localhost:1234');
  });

  it('resolves a file URL outside development', () => {
    process.env.NODE_ENV = 'production';

    expect(resolveHtmlPath('index.html')).toMatch(
      /^file:\/\/.*renderer\/index\.html$/,
    );
  });
});
