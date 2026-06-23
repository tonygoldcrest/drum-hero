/* eslint import/prefer-default-export: off */
import path from 'path';
import fs from 'fs';
import ini from 'ini';
import { randomUUID } from 'crypto';
import { AudioData, SongData } from '../types';

export function resolveHtmlPath(_htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    return process.env['ELECTRON_RENDERER_URL']!;
  }

  return `file://${path.resolve(__dirname, '../renderer/index.html')}`;
}

export function isUnderDirectory(songDir: string, rootDir: string): boolean {
  const relative = path.relative(rootDir, songDir);

  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function buildSongFromDir(
  dir: string,
  existing?: { id?: string; liked?: boolean },
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
  const audio: AudioData[] = fs
    .readdirSync(dir)
    .filter(
      (f) =>
        ['.ogg', '.opus', '.mp3'].includes(path.extname(f)) &&
        f !== 'crowd.ogg' &&
        f !== 'preview.ogg',
    )
    .map((f) => ({
      src: `gh://${path.join(dir, f)}`,
      name: path.parse(f).name,
    }));

  return {
    id: existing?.id ?? randomUUID(),
    dir,
    albumCover: albumCoverPath ? `gh://${albumCoverPath}` : null,
    ...(info.song ?? info.Song ?? info),
    format,
    audio,
    ...(existing?.liked !== undefined ? { liked: existing.liked } : {}),
  };
}
