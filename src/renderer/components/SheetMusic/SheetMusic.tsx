import { createRef, useEffect, useMemo, useRef, useState } from 'react';
import { ChartParser } from '../../../chart-parser/parser';
import { renderMusic } from '../../../chart-parser/renderer';
import { ParsedChart, RenderData } from '../../../chart-parser/types';
import {
  getCursorX,
  getNoteSvg,
  secondsToTicks,
  ticksToSeconds,
} from './utils';
import { cn } from '../../cn';
import { PlayheadStyle } from '../../types';
import { ActiveNoteInfo } from '../../hooks/types';
import { useActiveNoteScale } from '../../hooks/useActiveNoteScale';
import { useHitDetection } from '../../hooks/useHitDetection';
import { useProgressColoring } from '../../hooks/useProgressColoring';
import { useSettings } from '../../context/SettingsContext';

export interface SheetMusicProps {
  chart: ParsedChart;
  parsedMidi: ChartParser;
  showBarNumbers: boolean;
  enableColors: boolean;
  progressColoring: boolean;
  currentTime: number;
  onSelectMeasure: (time: number) => void;
  playheadStyle: PlayheadStyle;
}

export function SheetMusic({
  chart,
  parsedMidi,
  showBarNumbers,
  enableColors,
  progressColoring,
  currentTime,
  onSelectMeasure,
  playheadStyle,
}: SheetMusicProps) {
  const { selectedDevice, midiMapping } = useSettings();
  const vexflowContainerRef = useRef<HTMLDivElement>(null);
  const [renderData, setRenderData] = useState<RenderData[]>([]);
  const [highlightedMeasureIndex, setHighlightedMeasureIndex] =
    useState<number>(-1);
  const currentTick = useMemo(
    () =>
      chart
        ? secondsToTicks(currentTime, chart.resolution, chart.tempos)
        : null,
    [currentTime, chart],
  );
  const highlightsRef = useMemo(
    () => renderData.map(() => createRef<HTMLButtonElement>()),
    [renderData],
  );
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
  const measureHighlights = renderData.map(({ measure, stave }, index) => {
    const highlighted =
      playheadStyle === 'Measure' && index === highlightedMeasureIndex;

    return (
      <button
        key={index}
        ref={highlightsRef[index]}
        style={{
          top: stave.getY(),
          left: stave.getX() - 5,
          width: stave.getWidth() + 10,
          height: stave.getHeight() + 30,
        }}
        className={cn(
          'absolute z-[-3] rounded-[11px] border-0 bg-transparent cursor-pointer hover:bg-accent-soft-bg hover:shadow-accent-soft hover:border hover:border-accent-soft-border hover:z-[-1]',
          highlighted && 'bg-accent-soft-bg border-2 border-accent',
        )}
        onClick={() => {
          if (!chart) {
            return;
          }

          onSelectMeasure(
            ticksToSeconds(measure.startTick, chart.resolution, chart.tempos),
          );
        }}
      />
    );
  });
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
  const { hitKeys: hitKeysRef } = useHitDetection(
    currentTick,
    selectedDevice,
    midiMapping,
    renderData,
    chart,
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

  useActiveNoteScale(activeNoteInfo, renderData);
  useProgressColoring(
    activeNoteInfo,
    playheadStyle,
    renderData,
    progressColoring,
    hitKeysRef,
  );

  return (
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
  );
}
