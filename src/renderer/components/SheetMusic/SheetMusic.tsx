import { createRef, useEffect, useMemo, useRef, useState } from 'react';
import { parseChartFile } from 'scan-chart';

import {
  Cursor,
  CursorHandle,
  CursorLine,
  MeasureHighlight,
  VexflowContainer,
  Wrapper,
} from './styles';
import { ChartParser } from '../../../chart-parser/parser';
import { renderMusic } from '../../../chart-parser/renderer';
import { Difficulty, RenderData } from '../../../chart-parser/types';
import { PlayheadStyle } from '../../views/SongView/types';
import {
  getCursorX,
  getNoteSvg,
  secondsToTicks,
  ticksToSeconds,
} from './utils';
import {
  ActiveNoteInfo,
  useActiveNoteScale,
  useProgressColoring,
} from './hooks';

export interface SheetMusicProps {
  fileData?: Buffer;
  format?: 'mid' | 'chart';
  showBarNumbers: boolean;
  enableColors: boolean;
  currentTime: number;
  onSelectMeasure: (time: number) => void;
  difficulty: Difficulty;
  isFiveLane: boolean;
  playheadStyle: PlayheadStyle;
}

export function SheetMusic({
  fileData,
  format = 'mid',
  showBarNumbers,
  enableColors,
  currentTime,
  onSelectMeasure,
  difficulty,
  playheadStyle,
  isFiveLane,
}: SheetMusicProps) {
  const vexflowContainerRef = useRef<HTMLDivElement>(null);
  const [renderData, setRenderData] = useState<RenderData[]>([]);
  const [highlightedMeasureIndex, setHighlightedMeasureIndex] =
    useState<number>(-1);

  const chart = useMemo(
    () => (fileData ? parseChartFile(new Uint8Array(fileData), format) : null),
    [fileData, format],
  );

  const parsedMidi = useMemo(
    () => (chart ? new ChartParser(chart, isFiveLane, difficulty) : null),
    [chart, isFiveLane, difficulty],
  );

  const currentTick = useMemo(
    () =>
      chart
        ? secondsToTicks(currentTime, chart.resolution, chart.tempos)
        : null,
    [currentTime, chart],
  );

  // One button ref per measure, rebuilt only when the score re-renders.
  const highlightsRef = useMemo(
    () => renderData.map(() => createRef<HTMLButtonElement>()),
    [renderData],
  );

  useEffect(() => {
    if (!vexflowContainerRef.current || !parsedMidi) {
      return;
    }

    if (vexflowContainerRef.current.children.length > 0) {
      vexflowContainerRef.current.removeChild(
        vexflowContainerRef.current.children[0],
      );
    }

    setRenderData(
      renderMusic(
        vexflowContainerRef,
        parsedMidi,
        showBarNumbers,
        enableColors,
      ),
    );
  }, [parsedMidi, showBarNumbers, enableColors]);

  useEffect(() => {
    if (currentTick === null) {
      return;
    }

    const index = renderData.findIndex(
      ({ measure }) =>
        currentTick >= measure.startTick && currentTick < measure.endTick,
    );

    if (index >= 0) {
      setHighlightedMeasureIndex(index);
    }
  }, [currentTick, renderData]);

  useEffect(() => {
    if (playheadStyle === 'None' || highlightedMeasureIndex < 0) {
      return;
    }

    highlightsRef[highlightedMeasureIndex]?.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [highlightsRef, highlightedMeasureIndex, playheadStyle]);

  const activeNoteInfo = useMemo<ActiveNoteInfo | null>(() => {
    if (
      playheadStyle === 'None' ||
      currentTick === null ||
      highlightedMeasureIndex < 0
    ) {
      return null;
    }

    const measureData = renderData[highlightedMeasureIndex];

    if (!measureData) {
      return null;
    }

    const { renderedNotes } = measureData;

    let noteIdx = -1;
    for (let i = 0; i < renderedNotes.length; i++) {
      if (renderedNotes[i].tick <= currentTick) {
        noteIdx = i;
      } else {
        break;
      }
    }

    if (noteIdx === -1) {
      return null;
    }

    const noteSvgs = getNoteSvg(renderedNotes[noteIdx].note);

    if (noteSvgs.length === 0) {
      return null;
    }

    return {
      key: `${highlightedMeasureIndex}-${noteIdx}`,
      noteHeadEls: noteSvgs,
      noteIdx,
      measureIdx: highlightedMeasureIndex,
      renderedNotes,
    };
  }, [playheadStyle, currentTick, renderData, highlightedMeasureIndex]);

  useActiveNoteScale(activeNoteInfo, renderData);
  useProgressColoring(activeNoteInfo, playheadStyle, renderData);

  const cursorPosition = useMemo(() => {
    if (playheadStyle !== 'Cursor' || !chart || highlightedMeasureIndex < 0) {
      return null;
    }

    const measureData = renderData[highlightedMeasureIndex];

    if (!measureData) {
      return null;
    }

    const { stave } = measureData;
    const x = getCursorX(currentTime, chart, measureData);

    return {
      left: x,
      top: stave.getY(),
      height: stave.getHeight() + 30,
    };
  }, [playheadStyle, chart, currentTime, renderData, highlightedMeasureIndex]);

  const measureHighlights = renderData.map(({ measure, stave }, index) => (
    <MeasureHighlight
      key={index}
      ref={highlightsRef[index]}
      style={{
        top: stave.getY(),
        left: stave.getX() - 5,
        width: stave.getWidth() + 10,
        height: stave.getHeight() + 30,
      }}
      $highlighted={
        playheadStyle === 'Measure' && index === highlightedMeasureIndex
      }
      onClick={() => {
        if (!chart) {
          return;
        }

        onSelectMeasure(
          ticksToSeconds(measure.startTick, chart.resolution, chart.tempos),
        );
      }}
    />
  ));

  return (
    <Wrapper>
      <VexflowContainer ref={vexflowContainerRef} />
      {measureHighlights}
      {cursorPosition && (
        <Cursor
          style={{
            left: cursorPosition.left,
            top: cursorPosition.top,
            height: cursorPosition.height,
          }}
        >
          <CursorHandle />
          <CursorLine />
        </Cursor>
      )}
    </Wrapper>
  );
}
