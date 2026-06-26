import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSongFromDir } from './util';

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
});
