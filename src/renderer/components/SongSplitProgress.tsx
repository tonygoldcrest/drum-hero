import { SongData } from '../../types';
import appIcon from '../../../assets/icon.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

type Props = {
  songData: SongData;
  progress: number;
  onCancel: () => void;
};

export function SongSplitProgress({
  songData: { albumCover, name },
  progress,
  onCancel,
}: Props) {
  return (
    <div className="border-2 rounded-md border-border-soft flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-2 pb-1">
        <img
          src={albumCover ?? appIcon}
          onError={(e) => {
            e.currentTarget.src = appIcon;
          }}
          className="h-7 w-auto object-contain aspect-square rounded-xs shadow-frame"
        />

        <div className="text-[13px] font-bold text-text-muted font-ui">
          {name}
        </div>

        <button
          className={
            'bg-transparent p-0 border-0 cursor-pointer text-text-dim hover:text-text-muted'
          }
          onClick={onCancel}
        >
          <FontAwesomeIcon size="lg" icon={faXmark} />
        </button>
      </div>

      <div
        className="h-0.75"
        style={{
          background: 'var(--gradient-slider-fill)',
          width: `${progress}%`,
        }}
      ></div>
    </div>
  );
}
