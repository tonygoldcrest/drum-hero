import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeart as faHeartSolid,
  faDownload,
  faSpinner,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart } from '@fortawesome/free-regular-svg-icons';
import { times } from 'es-toolkit/compat';
import appIcon from '../../../assets/icon.png';
import { SongData, StemToolsStatus } from '../../types';
import { cn } from '../cn';
import { Button, Tooltip } from 'antd';
import { useMemo } from 'react';
import { Mode } from './SongFilter';
import { SongMenu } from './SongMenu';

export interface SongListItemProps {
  songData: SongData;
  onLikeChange: (id: string, liked: boolean) => void;
  onDownload: (id: string) => void;
  onSplit: (id: string) => void;
  downloading?: boolean;
  splitting: boolean;
  downloaded?: boolean;
  mode: Mode;
  downloadingDisabled: boolean;
  stemToolsStatus: StemToolsStatus;
}

export function SongListItem({
  songData: { albumCover, id, name, artist, charter, diff_drums, liked, audio },
  onLikeChange,
  onDownload,
  downloading,
  downloaded,
  splitting,
  onSplit,
  mode,
  downloadingDisabled,
  stemToolsStatus,
}: SongListItemProps) {
  const navigate = useNavigate();

  const indicator = useMemo(() => {
    if (mode === 'local') {
      return (
        <div className="flex flex-col gap-2 items-center h-full">
          <SongMenu
            id={id}
            stemToolsStatus={stemToolsStatus}
            canSplit={(audio?.length ?? 0) === 1}
            splitting={splitting}
            onSplit={() => onSplit(id)}
          />

          <button
            className={cn(
              'bg-transparent p-0 border-0 cursor-pointer hover:text-accent-hover mt-auto',
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
      );
    }

    if (!downloading && !downloaded) {
      const button = (
        <Button
          icon={<FontAwesomeIcon icon={faDownload} />}
          disabled={downloadingDisabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDownload(id);
          }}
        />
      );
      return downloadingDisabled ? (
        <Tooltip
          title="To enable download, select library folder"
          placement="left"
        >
          {button}
        </Tooltip>
      ) : (
        button
      );
    }

    return (
      <FontAwesomeIcon
        className={cn(downloading ? 'text-text-dim' : 'text-accent', 'px-1.5')}
        size="xl"
        icon={downloading ? faSpinner : faCheck}
        spin={downloading}
      />
    );
  }, [
    downloading,
    downloaded,
    onDownload,
    id,
    liked,
    onLikeChange,
    mode,
    downloadingDisabled,
    audio?.length,
    stemToolsStatus,
    onSplit,
    splitting,
  ]);

  return (
    <div className="w-full">
      <div
        onClick={() => {
          if (mode === 'local') {
            navigate(`/${id}`);
          }
        }}
        className={cn(
          'w-full flex border border-border-soft p-2 no-underline bg-surface rounded-[11px] transition-all duration-100 ease-in-out cursor-default',
          {
            'hover:bg-accent-soft-bg hover:border-accent-soft-border cursor-pointer':
              mode === 'local',
          },
        )}
      >
        <div className="flex items-center">
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

          {indicator}
        </div>
      </div>
    </div>
  );
}
