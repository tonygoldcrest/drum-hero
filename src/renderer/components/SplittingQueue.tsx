import { SongData } from '../../types';
import { SongSplitProgress } from './SongSplitProgress';

interface Props {
  splittingIds: Set<string>;
  splitProgress: Map<string, number>;
  songList: SongData[];
}

export function SplittingQueue({
  splittingIds,
  splitProgress,
  songList,
}: Props) {
  if (splittingIds.size === 0) {
    return null;
  }

  return (
    <div className="flex gap-3 flex-wrap items-center">
      <div className="text-text-muted">Splitting queue:</div>
      {[...splittingIds].map((id) => {
        const songData = songList.find((s) => s.id === id);

        if (!songData) {
          return null;
        }

        return (
          <SongSplitProgress
            key={id}
            songData={songData}
            progress={splitProgress.get(id) ?? 0}
            onCancel={() =>
              window.electron.ipcRenderer.sendMessage('cancel-split', id)
            }
          />
        );
      })}
    </div>
  );
}
