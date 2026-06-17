import { SngStream } from '@eliwhite/parse-sng';
import Store from 'electron-store';
import ini from 'ini';
import path from 'path';
import fs from 'fs';

type Props = {
  url: string;
  md5: string;
  name: string;
  artist: string;
  charter: string;
};

export function buildDownloadSong(store: Store) {
  return async (
    event: Electron.IpcMainEvent,
    { url, md5, name, artist, charter }: Props,
  ) => {
    try {
      const lastOpenedPath = store.get('lastOpenedPath') as string | undefined;
      if (!lastOpenedPath) {
        event.reply('download-song', {
          success: false,
          error: 'No folder selected',
        });
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();

      const uint8 = new Uint8Array(arrayBuffer);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(uint8);
          controller.close();
        },
      });

      const sngStream = new SngStream(stream, { generateSongIni: true });
      const files: { name: string; data: Buffer }[] = [];

      await new Promise<void>((resolve, reject) => {
        sngStream.on('error', reject);
        sngStream.on(
          'file',
          async (
            fileName: string,
            fileStream: ReadableStream<Uint8Array>,
            nextFile: (() => void) | null,
          ) => {
            const reader = fileStream.getReader();
            const chunks: Uint8Array[] = [];

            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                break;
              }

              chunks.push(value);
            }

            const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
            const merged = Buffer.alloc(totalLen);
            let offset = 0;
            for (const chunk of chunks) {
              merged.set(chunk, offset);
              offset += chunk.length;
            }
            files.push({ name: fileName, data: merged });
            if (nextFile) {
              nextFile();
            } else {
              resolve();
            }
          },
        );
        sngStream.start();
      });

      const folderName = `${artist} - ${name} (${charter})`.replace(
        /[\\/:*?"<>|]/g,
        '',
      );
      const outputDir = path.join(lastOpenedPath, folderName);
      fs.mkdirSync(outputDir, { recursive: true });

      for (const file of files) {
        fs.writeFileSync(path.join(outputDir, file.name), file.data);
      }

      const songIniFile = files.find((f) => f.name === 'song.ini');
      const info = songIniFile
        ? ini.parse(songIniFile.data.toString('utf-8'))
        : {};

      const supportedImageExtensions = ['png', 'jpg', 'jpeg'];
      const albumCoverPath = supportedImageExtensions
        .map((ext) => path.join(outputDir, `album.${ext}`))
        .find((p) => fs.existsSync(p));

      const songData = {
        id: md5,
        dir: outputDir,
        albumCover: albumCoverPath ? `gh://${albumCoverPath}` : null,
        ...(info.song ?? info.Song ?? info),
      };

      store.set(`songs.${md5}`, songData);
      event.reply('download-song', {
        success: true,
        song: {
          ...songData,
          updatedAt: fs.statSync(outputDir).mtime.toISOString(),
        },
      });
    } catch (err) {
      event.reply('download-song', { success: false, error: String(err) });
    }
  };
}
