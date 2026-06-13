import { RefObject, createRef, useEffect, useRef, useState } from 'react';
import { Midi } from '@tonejs/midi';
import { MeasureHighlight, VexflowContainer, Wrapper } from './styles';
import { MidiParser as MidiParserV2 } from '../../../midi-parser/v2/parser';
import { renderMusic as renderMusicV2 } from '../../../midi-parser/v2/renderer';
import { MidiParser as MidiParserV1 } from '../../../midi-parser/v1/parser';
import { renderMusic as renderMusicV1 } from '../../../midi-parser/v1/renderer';
import { Difficulty } from '../../../midi-parser/types';
import { RenderData as RenderDataV2 } from '../../../midi-parser/v2/types';
import { RenderData as RenderDataV1 } from '../../../midi-parser/v1/types';

export interface SheetMusicProps {
  midiData?: Buffer;
  showBarNumbers: boolean;
  enableColors: boolean;
  currentTime: number;
  onSelectMeasure: (time: number) => void;
  difficulty: Difficulty;
  isFiveLane: boolean;
  parserVersion?: 'v1' | 'v2';
}

export function SheetMusic({
  midiData,
  showBarNumbers,
  enableColors,
  currentTime,
  onSelectMeasure,
  difficulty,
  isFiveLane,
  parserVersion = 'v2',
}: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const highlightsRef = useRef<RefObject<HTMLButtonElement>[]>([]);
  const vexflowContainerRef = useRef<HTMLDivElement>(null);
  const [parsedMidi, setParsedMidi] = useState<
    MidiParserV1 | MidiParserV2 | null
  >(null);
  const [midi, setMidi] = useState<Midi | null>(null);
  const [renderData, setRenderData] = useState<(RenderDataV1 | RenderDataV2)[]>(
    [],
  );
  const [highlightedMeasureIndex, setHighlightedMeasureIndex] =
    useState<number>(-1);

  useEffect(() => {
    if (!vexflowContainerRef.current || !midiData) {
      return;
    }

    const mid = new Midi(midiData);
    setMidi(mid);
  }, [midiData]);

  useEffect(() => {
    if (!midi) {
      return;
    }

    setParsedMidi(
      parserVersion === 'v2'
        ? new MidiParserV2(midi.toJSON(), isFiveLane, difficulty)
        : new MidiParserV1(midi.toJSON(), isFiveLane, difficulty),
    );
  }, [midi, isFiveLane, difficulty, parserVersion]);

  useEffect(() => {
    if (!vexflowContainerRef.current || !parsedMidi) {
      return;
    }

    if (parserVersion === 'v2' && !(parsedMidi instanceof MidiParserV2)) {
      return;
    }
    if (parserVersion === 'v1' && !(parsedMidi instanceof MidiParserV1)) {
      return;
    }

    if (vexflowContainerRef.current?.children.length > 0) {
      vexflowContainerRef.current.removeChild(
        vexflowContainerRef.current.children[0],
      );
    }

    setRenderData(
      parserVersion === 'v2'
        ? renderMusicV2(
            vexflowContainerRef,
            parsedMidi as MidiParserV2,
            showBarNumbers,
            enableColors,
          )
        : renderMusicV1(
            vexflowContainerRef,
            parsedMidi as MidiParserV1,
            showBarNumbers,
            enableColors,
          ),
    );
  }, [parsedMidi, showBarNumbers, enableColors, parserVersion]);

  useEffect(() => {
    if (!midi || !renderData) {
      return;
    }

    highlightsRef.current = renderData.map(() =>
      createRef<HTMLButtonElement>(),
    );

    const currentTick = midi.header.secondsToTicks(currentTime) ?? 0;
    const highlightedMeasure = renderData.find(
      ({ measure }) =>
        currentTick >= measure.startTick && currentTick < measure.endTick,
    );

    if (!highlightedMeasure) {
      return;
    }

    setHighlightedMeasureIndex(renderData.indexOf(highlightedMeasure));
  }, [currentTime, midi, renderData]);

  useEffect(() => {
    if (highlightsRef.current.length === 0) {
      return;
    }

    highlightsRef.current[highlightedMeasureIndex].current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [highlightedMeasureIndex]);

  const measureHighlights = renderData.map(({ measure, stave }, index) => {
    const isHighlighted = index === highlightedMeasureIndex;
    return (
      <MeasureHighlight
        key={index}
        ref={highlightsRef.current[index]}
        style={{
          top: stave.getY() + 10,
          left: stave.getX() - 5,
          width: stave.getWidth() + 10,
          height: stave.getHeight(),
        }}
        $highlighted={isHighlighted}
        onClick={() => {
          if (!midi) {
            return;
          }

          onSelectMeasure(midi.header.ticksToSeconds(measure.startTick));
        }}
      />
    );
  });

  return (
    <Wrapper ref={containerRef}>
      <VexflowContainer ref={vexflowContainerRef} />
      {measureHighlights}
    </Wrapper>
  );
}
