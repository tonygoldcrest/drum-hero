import { RefObject } from 'react';
import { cn } from '../../cn';
import { PlayheadStyle } from '../../types';
import { Measure, RenderData } from '../../../chart-parser/types';
import { CursorPosition } from '../../hooks/usePlayhead';
import { SongData } from '../../../types';

export interface SheetMusicProps {
  songData: SongData;
  renderData: RenderData[];
  vexflowContainerRef: RefObject<HTMLDivElement | null>;
  highlightsRef: RefObject<HTMLDivElement | null>[];
  highlightedMeasureIndex: number;
  cursorPosition: CursorPosition | null;
  playheadStyle: PlayheadStyle;
  isDev: boolean;
  onSelectMeasure: (measure: Measure) => void;
}

export function SheetMusic({
  songData,
  renderData,
  vexflowContainerRef,
  highlightsRef,
  highlightedMeasureIndex,
  cursorPosition,
  playheadStyle,
  isDev,
  onSelectMeasure,
}: SheetMusicProps) {
  const measureHighlights = renderData.map(({ measure, stave }, index) => {
    const highlighted =
      playheadStyle === 'Measure' && index === highlightedMeasureIndex;

    return (
      <div
        key={index}
        ref={highlightsRef[index]}
        style={{
          top: stave.getY(),
          left: stave.getX() - 5,
          width: stave.getWidth() + 10,
          height: stave.getHeight() + 30,
        }}
        className={cn(
          'absolute z-[-3] rounded-[11px] border-0 bg-transparent',
          highlighted && 'bg-accent-soft-bg border-2 border-accent',
          isDev &&
            'cursor-pointer hover:bg-accent-soft-bg hover:shadow-accent-soft hover:border hover:border-accent-soft-border hover:z-[-1]',
        )}
        onClick={() => {
          if (!isDev) {
            return;
          }

          onSelectMeasure(measure);
        }}
      />
    );
  });

  return (
    <div className="flex flex-col items-center min-w-max bg-paper rounded-[11px] p-10">
      <h1 className="my-0 mx-auto text-4xl text-ink font-semibold">
        {songData.name}
      </h1>
      <div className="ml-auto text-[15px] italic font-bold flex flex-col items-end text-ink">
        <div>Music by {songData.artist}</div>
        <div>Arranged by {songData.charter}</div>
      </div>
      <div className="min-w-max relative z-0">
        <div
          ref={vexflowContainerRef}
          className="min-w-max pointer-events-none **:pointer-events-none"
        />
        {measureHighlights}
        {cursorPosition && (
          <div
            className="absolute z-1 -translate-x-1/2 pointer-events-none shadow-accent-button"
            style={{
              left: cursorPosition.left,
              top: cursorPosition.top,
              height: cursorPosition.height,
            }}
          >
            <div
              className="absolute w-3 h-3 bg-accent left-1/2 rounded-[3px]"
              style={{ transform: 'translateX(-50%) rotate(45deg)' }}
            />
            <div className="absolute w-1 bg-accent h-full rounded-[3px] left-1/2 -translate-x-1/2" />
          </div>
        )}
      </div>
    </div>
  );
}
