import path from 'path';
import fs from 'fs';
import ini from 'ini';
import { randomUUID } from 'crypto';
import { Difficulty, parseChartFile } from 'scan-chart';
import { AudioData, SongData } from '../types';

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

function readDrumDifficulties(
  dir: string,
  format: 'mid' | 'chart',
  proDrums: boolean,
  fiveLaneDrums: boolean,
): Difficulty[] {
  try {
    const file = path.join(dir, format === 'mid' ? 'notes.mid' : 'notes.chart');
    const chart = parseChartFile(
      new Uint8Array(fs.readFileSync(file)),
      format,
      { pro_drums: proDrums, five_lane_drums: fiveLaneDrums },
    );
    const present = new Set(
      chart.trackData
        .filter((t) => t.instrument === 'drums')
        .map((t) => t.difficulty),
    );

    return DIFFICULTY_ORDER.filter((d) => present.has(d));
  } catch {
    return [];
  }
}

export function resolveHtmlPath(_htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    return process.env['ELECTRON_RENDERER_URL']!;
  }

  return `file://${path.resolve(__dirname, '../renderer/index.html')}`;
}

export function chartGlobPattern(rootDir: string): string {
  return `${rootDir.replace(/\\/g, '/')}/**/{notes.mid,notes.chart}`;
}

export const ASSET_PROTOCOL = 'sightkick';

export function toAssetUrl(absPath: string): string {
  return `${ASSET_PROTOCOL}://local/${encodeURIComponent(absPath)}`;
}

export function assetUrlToFilePath(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

export function isUnderDirectory(songDir: string, rootDir: string): boolean {
  const relative = path.relative(rootDir, songDir);

  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function buildSongFromDir(
  dir: string,
  existing?: {
    id?: string;
    liked?: boolean;
    scoreData?: SongData['scoreData'];
  },
): SongData | null {
  const songIniPath = path.join(dir, 'song.ini');

  if (!fs.existsSync(songIniPath)) {
    return null;
  }

  const info = ini.parse(
    fs
      .readFileSync(songIniPath, 'utf-8')
      .replace(/<color=[^>]*>(.*?)<\/color>/g, '$1'),
  );
  const supportedImageExtensions = ['png', 'jpg', 'jpeg'];
  const albumCoverPath = supportedImageExtensions
    .map((ext) => path.join(dir, `album.${ext}`))
    .find((p) => fs.existsSync(p));
  const hasMid = fs.existsSync(path.join(dir, 'notes.mid'));
  const hasChart = fs.existsSync(path.join(dir, 'notes.chart'));

  if (!hasMid && !hasChart) {
    return null;
  }

  const format: 'mid' | 'chart' = hasMid ? 'mid' : 'chart';
  const meta = info.song ?? info.Song ?? info;
  const drumDifficulties = readDrumDifficulties(
    dir,
    format,
    meta.pro_drums === 'True',
    meta.five_lane_drums === 'True',
  );
  const audio: AudioData[] = fs
    .readdirSync(dir)
    .filter(
      (f) =>
        ['.ogg', '.opus', '.mp3'].includes(path.extname(f)) &&
        f !== 'crowd.ogg' &&
        f !== 'preview.ogg',
    )
    .map((f) => ({
      src: toAssetUrl(path.join(dir, f)),
      name: path.parse(f).name,
    }));

  return {
    id: existing?.id ?? randomUUID(),
    dir,
    albumCover: albumCoverPath ? toAssetUrl(albumCoverPath) : null,
    ...meta,
    format,
    audio,
    drumDifficulties,
    ...(existing?.liked !== undefined ? { liked: existing.liked } : {}),
    ...(existing?.scoreData !== undefined
      ? { scoreData: existing.scoreData }
      : {}),
  };
}
