import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';
import { faHeart } from '@fortawesome/free-regular-svg-icons';
import { times } from 'es-toolkit/compat';
import appIcon from '../../../assets/icon.png';
import { SongData } from '../../types';
import { cn } from '../cn';

export interface SongListItemProps {
  songData: SongData;
  onLikeChange: (id: string, liked: boolean) => void;
}

export function SongListItem({
  songData: { albumCover, id, name, artist, charter, diff_drums, liked },
  onLikeChange,
}: SongListItemProps) {
  return (
    <div className="p-1 w-full">
      <Link
        to={{ pathname: `/${id}` }}
        className="w-full flex border border-border-soft p-[10px] no-underline bg-surface items-center rounded-[11px] transition-all duration-100 ease-in-out hover:bg-accent-soft-bg hover:border-accent-soft-border"
      >
        <img
          src={albumCover ?? appIcon}
          onError={(e) => {
            e.currentTarget.src = appIcon;
          }}
          className="h-15 w-auto object-contain aspect-square rounded-[11px] shadow-frame"
        />

        <div className="ml-2">
          <div className="text-[18px] font-bold mb-1 text-text-body font-display">
            {name}
          </div>
          <div className="text-text-muted font-ui text-sm">{artist}</div>
        </div>

        <div className="flex ml-auto items-center gap-5">
          {charter && (
            <div className="flex items-end flex-col">
              <div className="text-text-dim text-xs">charter</div>
              <div className="text-text-muted text-sm mt-1">
                {charter.replace(/<\S+?>/g, '')}
              </div>
            </div>
          )}

          {diff_drums && (
            <div className="flex items-center gap-1">
              {times(5, (i) => (
                <div
                  key={i}
                  className={cn(
                    'w-2 h-1 rounded-xs',
                    i < Number(diff_drums) ? 'bg-accent' : 'bg-text-dimmer',
                  )}
                />
              ))}
              <div className="text-text-muted text-[13px] ml-2">
                {diff_drums}
              </div>
            </div>
          )}

          <button
            className={cn(
              'bg-transparent p-0 border-0 cursor-pointer hover:!text-accent-hover',
              liked ? 'text-accent' : 'text-text-dim',
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLikeChange(id, !liked);
            }}
          >
            <FontAwesomeIcon size="xl" icon={liked ? faHeartSolid : faHeart} />
          </button>
        </div>
      </Link>
    </div>
  );
}
