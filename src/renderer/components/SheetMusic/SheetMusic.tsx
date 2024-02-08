import { RefObject, createRef, useEffect, useRef, useState } from 'react';
import { Midi } from '@tonejs/midi';
import { MeasureHighlight, VexflowContainer, Wrapper } from './styles';
import { Difficulty, MidiParser } from '../../../midi-parser/parser';
import { RenderData, renderMusic } from '../../../midi-parser/renderer';

export interface SheetMusicProps {
  midiData?: Buffer;
  showBarNumbers: boolean;
  enableColors: boolean;
  currentTime: number;
  onSelectMeasure: (time: number) => void;
  difficulty: Difficulty;
}

export function SheetMusic({
  midiData,
  showBarNumbers,
  enableColors,
  currentTime,
  onSelectMeasure,
  difficulty,
}: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const highlightsRef = useRef<RefObject<HTMLButtonElement>[]>([]);
  const vexflowContainerRef = useRef<HTMLDivElement>(null);
  const [parsedMidi, setParsedMidi] = useState<MidiParser | null>(null);
  const [midi, setMidi] = useState<Midi | null>(null);
  const [renderData, setRenderData] = useState<RenderData[]>([]);
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

    setParsedMidi(new MidiParser(midi.toJSON(), difficulty));
  }, [midi, difficulty]);

  useEffect(() => {
    if (!vexflowContainerRef.current || !parsedMidi) {
      return;
    }

    if (vexflowContainerRef.current?.children.length > 0) {
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
