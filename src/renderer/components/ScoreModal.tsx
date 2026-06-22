import { Button, Divider } from 'antd';
import { useEffect, useMemo, useRef } from 'react';
import { cn } from '../cn';
import { ScoreData, SongData } from '../../types';
import { Difficulty } from 'scan-chart';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';
import { faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';
import { faRepeat } from '@fortawesome/free-solid-svg-icons';
import { times } from 'es-toolkit/compat';
import themedark from '../theme';
import { calculateAccuracy, getStarRating } from '../views/utils';

type Props = {
  isOpen: boolean;
  onRetry: () => void;
  onNextSong: () => void;
  songData: SongData | null;
  difficulty: Difficulty;
  scoreData?: ScoreData;
};

export function ScoreModal({
  isOpen,
  onRetry,
  onNextSong,
  songData,
  difficulty,
  scoreData,
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const starRating = useMemo(() => {
    if (!scoreData) {
      return 0;
    }

    return getStarRating(scoreData);
  }, [scoreData]);

  useEffect(() => {
    if (isOpen) {
      backdropRef.current?.showPopover();
    } else {
      backdropRef.current?.hidePopover();
    }
  }, [isOpen]);

  return (
    <div
      ref={backdropRef}
      className={cn('fixed w-full h-full backdrop-blur-xs bg-transparent', {
        flex: isOpen,
      })}
      popover="manual"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        event.preventDefault();
      }}
    >
      <div
        className="border border-border rounded-xl shadow-panel font-ui w-140 m-auto flex flex-col bg-bg"
        ref={modalRef}
      >
        <div
          className="p-4 rounded-t-xl"
          style={{ background: 'var(--gradient-header)' }}
        >
          <div className="text-accent-text font-semibold text-xs uppercase">
            Song Complete
          </div>
          <div>
            <div className="text-text-body text-2xl font-bold">
              {songData?.name}
            </div>
            <div className="text-text-faint flex items-center gap-1 text-sm">
              <div>{songData?.artist}</div>
              <div>·</div>
              <div>{difficulty}</div>
            </div>
          </div>
        </div>
        <Divider />
        <div className="flex flex-col gap-5 p-4 items-center">
          <div className="flex gap-3 items-center">
            {times(5, (num) => (
              <FontAwesomeIcon
                key={num}
                icon={
                  starRating && num < starRating ? faStarSolid : faStarRegular
                }
                size="3x"
                style={{
                  color:
                    starRating && num < starRating
                      ? themedark.color.star
                      : themedark.color.textDim,
                  filter:
                    starRating && num < starRating ? themedark.shadow.star : '',
                }}
              />
            ))}
          </div>
          <div className="text-text-muted text-[18px]">
            {Math.round((scoreData ? calculateAccuracy(scoreData) : 0) * 100)}%
            accuracy
          </div>
          <div className="flex flex-col gap-1 items-center">
            <div className="flex items-center text-text-muted text-[18px] gap-2">
              <div className="text-text-body font-bold text-4xl">
                {scoreData?.hitNotes ?? 0}
              </div>
              <div>/</div>
              <div>{scoreData?.totalNotes} notes hit</div>
            </div>
            <div className="flex items-center text-text-dim text-[14px] gap-2">
              {scoreData?.falseHits} false hits
            </div>
          </div>
        </div>
        <Divider />
        <div
          className="text-text-body font-semibold text-xl p-4 rounded-b-xl flex gap-3"
          style={{ background: 'var(--gradient-header-reverse)' }}
        >
          <Button
            className="grow"
            onClick={() => onRetry()}
            icon={<FontAwesomeIcon icon={faRepeat} />}
            size="large"
          >
            Retry
          </Button>
          <Button
            className="grow"
            type="primary"
            onClick={() => onNextSong()}
            size="large"
          >
            Next song
          </Button>
        </div>
      </div>
    </div>
  );
}
