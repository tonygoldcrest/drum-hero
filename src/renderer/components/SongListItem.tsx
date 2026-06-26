import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeart as faHeartSolid,
  faDownload,
  faSpinner,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import {
  faHeart,
  faStar as faStarRegular,
} from '@fortawesome/free-regular-svg-icons';
import { faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';
import { times } from 'es-toolkit/compat';
import appIcon from '../../../assets/icon.png';
import { SongData, StemToolsStatus } from '../../types';
import { cn } from '../cn';
import { Button, Tooltip } from 'antd';
import { useMemo } from 'react';
import { Mode } from './SongFilter';
import { SongMenu } from './SongMenu';
import themedark from '../theme';
import { Difficulty } from 'scan-chart';
import { calculateAccuracy, getStarRating } from '../views/utils';

function DifficultyRing({ value }: { value: number }) {
  const size = 44;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 15;
  const innerR = 11;
  const count = 5;
  const gapDeg = 6;
  const segDeg = (360 - gapDeg * count) / count;
  const toXY = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180;

    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const segments = times(count, (i) => {
    const startAngle = -90 + i * (segDeg + gapDeg);
    const endAngle = startAngle + segDeg;
    const o1 = toXY(startAngle, outerR);
    const o2 = toXY(endAngle, outerR);
    const i1 = toXY(startAngle, innerR);
    const i2 = toXY(endAngle, innerR);
    const large = segDeg > 180 ? 1 : 0;

    return (
      <path
        key={i}
        d={`M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 ${large} 0 ${i1.x} ${i1.y} Z`}
        fill={i < value ? 'var(--color-accent)' : 'var(--color-surface-raised)'}
      />
    );
  });

  return (
    <svg width={size} height={size}>
      {segments}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--color-text-muted)"
        fontSize="12"
        fontFamily="var(--font-ui)"
        fontWeight="600"
      >
        {value}
      </text>
    </svg>
  );
}

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
  focused?: boolean;
}

export function SongListItem({
  songData: {
    albumCover,
    id,
    dir,
    name,
    artist,
    charter,
    diff_drums,
    liked,
    audio,
    scoreData,
  },
  onLikeChange,
  onDownload,
  downloading,
  downloaded,
  splitting,
  onSplit,
  mode,
  downloadingDisabled,
  stemToolsStatus,
  focused,
}: SongListItemProps) {
  const navigate = useNavigate();
  const score = useMemo(() => {
    const result = (['expert', 'hard', 'medium', 'easy'] as Difficulty[])
      .map((d) => {
        const entry = scoreData?.[d];

        return entry && (entry.hitNotes ?? 0) > 0
          ? { difficulty: d, score: entry }
          : null;
      })
      .find((item) => item !== null);

    return result
      ? {
          difficulty: result.difficulty,
          starRating: getStarRating(result.score),
          accuracy: calculateAccuracy(result.score),
        }
      : null;
  }, [scoreData]);
  const indicator = useMemo(() => {
    if (mode === 'local') {
      return (
        <div className="flex flex-col gap-2 items-center h-full">
          <SongMenu
            id={id}
            dir={dir}
            stemToolsStatus={stemToolsStatus}
            canSplit={(audio?.length ?? 0) === 1}
            splitting={splitting}
            onSplit={() => onSplit(id)}
          />

          <button
            data-testid="like-toggle"
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
          data-testid="download-button"
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
        data-testid={
          downloading ? 'downloading-indicator' : 'downloaded-indicator'
        }
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
    dir,
    onSplit,
    splitting,
  ]);

  return (
    <div
      onClick={() => {
        if (mode === 'local') {
          navigate(`/${id}`);
        }
      }}
      data-testid={`song-item-${id}`}
      className={cn(
        'flex border border-border-soft grow no-underline bg-surface rounded-[11px] transition-all duration-100 ease-in-out cursor-default p-2',
        {
          'hover:bg-accent-soft-bg hover:border-accent-soft-border cursor-pointer':
            mode === 'local',
          'bg-accent-soft-bg border-accent-soft-border outline-2 outline-accent':
            focused,
        },
      )}
    >
      <div className="flex items-center">
        <img
          src={albumCover ?? appIcon}
          onError={(e) => {
            e.currentTarget.src = appIcon;
          }}
          className="h-15 w-auto object-contain aspect-square rounded-lg shadow-frame"
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

        <div className="flex flex-col gap-1 items-center">
          {score && (
            <div className="text-xs text-text-dim">{score.difficulty}</div>
          )}

          <div className="flex gap-1 items-center">
            {times(5, (num) => {
              const isFilled = score && num < score.starRating;
              const isPerfect = score && score.accuracy === 1;

              return (
                <FontAwesomeIcon
                  key={num}
                  icon={isFilled ? faStarSolid : faStarRegular}
                  size="xs"
                  style={{
                    color: isPerfect
                      ? themedark.color.starPerfect
                      : isFilled
                      ? themedark.color.star
                      : themedark.color.textDim,
                  }}
                />
              );
            })}
          </div>
        </div>

        {diff_drums && <DifficultyRing value={Number(diff_drums)} />}

        {indicator}
      </div>
    </div>
  );
}
