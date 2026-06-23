import { RefObject, useEffect, useMemo, useRef } from 'react';
import { ParsedChart, Measure, RenderData } from '../../chart-parser/types';
import { SongData, MidiDevice, MidiMapping } from '../../types';
import { PlayheadStyle } from '../types';
import { secondsToTicks } from '../views/utils';
import { useCurrentTime } from '../hooks/useCurrentTime';
import { usePlayhead } from '../hooks/usePlayhead';
import { useHitDetection, HitDetectionResult } from '../hooks/useHitDetection';
import { HitHandler, useNoteDecoration } from '../hooks/useNoteDecoration';
import { TimeStore } from '../services/time-store';
import { SheetMusic } from './SheetMusic/SheetMusic';

export interface SongSheetProps {
  chart: ParsedChart;
  renderData: RenderData[];
  songData: SongData;
  timeStore: TimeStore;
  delaySeconds: number;
  playheadStyle: PlayheadStyle;
  progressColoring: boolean;
  selectedDevice: MidiDevice | null;
  midiMapping: MidiMapping;
  isPlaying: boolean;
  isDev: boolean;
  vexflowContainerRef: RefObject<HTMLDivElement | null>;
  onSelectMeasure: (measure: Measure) => void;
  scoreRef: RefObject<HitDetectionResult | undefined>;
}

export function SongSheet({
  chart,
  renderData,
  songData,
  timeStore,
  delaySeconds,
  playheadStyle,
  progressColoring,
  selectedDevice,
  midiMapping,
  isPlaying,
  isDev,
  vexflowContainerRef,
  onSelectMeasure,
  scoreRef,
}: SongSheetProps) {
  const currentTime = useCurrentTime(timeStore);
  const chartTime = currentTime - delaySeconds;
  const currentTick = useMemo(
    () => secondsToTicks(chartTime, chart.resolution, chart.tempos),
    [chartTime, chart],
  );
  const {
    highlightedMeasureIndex,
    cursorPosition,
    activeNoteInfo,
    highlightsRef,
  } = usePlayhead({
    chart,
    currentTime: chartTime,
    currentTick,
    renderData,
    playheadStyle,
  });
  const onHitRef = useRef<HitHandler | null>(null);
  const { hitKeys, incorrectHitCount } = useHitDetection(
    currentTick,
    selectedDevice,
    midiMapping,
    renderData,
    chart,
    onHitRef,
    isPlaying,
  );

  useNoteDecoration(
    activeNoteInfo,
    playheadStyle,
    renderData,
    progressColoring,
    hitKeys,
    onHitRef,
  );

  useEffect(() => {
    scoreRef.current = { hitKeys, incorrectHitCount };
  }, [scoreRef, hitKeys, incorrectHitCount]);

  return (
    <SheetMusic
      songData={songData}
      renderData={renderData}
      vexflowContainerRef={vexflowContainerRef}
      highlightsRef={highlightsRef}
      highlightedMeasureIndex={highlightedMeasureIndex}
      cursorPosition={cursorPosition}
      playheadStyle={playheadStyle}
      isDev={isDev}
      onSelectMeasure={onSelectMeasure}
    />
  );
}
