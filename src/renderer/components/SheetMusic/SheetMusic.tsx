import { RefObject, createRef, useEffect, useRef, useState } from 'react';
import { parseChartFile } from 'scan-chart';

type ParsedChart = ReturnType<typeof parseChartFile>;
import { MeasureHighlight, VexflowContainer, Wrapper } from './styles';
import { ChartParser as ChartParserV2 } from '../../../chart-parser/v2/parser';
import { renderMusic as renderMusicV2 } from '../../../chart-parser/v2/renderer';
import { ChartParser as ChartParserV1 } from '../../../chart-parser/v1/parser';
import { renderMusic as renderMusicV1 } from '../../../chart-parser/v1/renderer';
import { Difficulty } from '../../../chart-parser/types';
import { RenderData as RenderDataV2 } from '../../../chart-parser/v2/types';
import { RenderData as RenderDataV1 } from '../../../chart-parser/v1/types';

export interface SheetMusicProps {
  fileData?: Buffer;
  format?: 'mid' | 'chart';
  showBarNumbers: boolean;
  enableColors: boolean;
  currentTime: number;
  onSelectMeasure: (time: number) => void;
  difficulty: Difficulty;
  isFiveLane: boolean;
  parserVersion?: 'v1' | 'v2';
}

function ticksToSeconds(
  tick: number,
  resolution: number,
  tempos: ParsedChart['tempos'],
): number {
  let tempo = tempos[0] ?? { tick: 0, beatsPerMinute: 120, msTime: 0 };

  for (const t of tempos) {
    if (t.tick <= tick) {
      tempo = t;
    } else {
      break;
    }
  }

  const deltaTicks = tick - tempo.tick;
  const msPerTick = 60000 / tempo.beatsPerMinute / resolution;

  return (tempo.msTime + deltaTicks * msPerTick) / 1000;
}

function secondsToTicks(
  seconds: number,
  resolution: number,
  tempos: ParsedChart['tempos'],
): number {
  const ms = seconds * 1000;
  let tempo = tempos[0] ?? { tick: 0, beatsPerMinute: 120, msTime: 0 };

  for (const t of tempos) {
    if (t.msTime <= ms) {
      tempo = t;
    } else {
      break;
    }
  }

  const deltaMs = ms - tempo.msTime;
  const ticksPerMs = (tempo.beatsPerMinute * resolution) / 60000;

  return Math.round(tempo.tick + deltaMs * ticksPerMs);
}

export function SheetMusic({
  fileData,
  format = 'mid',
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
    ChartParserV1 | ChartParserV2 | null
  >(null);
  const [chart, setChart] = useState<ParsedChart | null>(null);
  const [renderData, setRenderData] = useState<(RenderDataV1 | RenderDataV2)[]>(
    [],
  );
  const [highlightedMeasureIndex, setHighlightedMeasureIndex] =
    useState<number>(-1);

  useEffect(() => {
    if (!vexflowContainerRef.current || !fileData) {
      return;
    }
    const parsed = parseChartFile(new Uint8Array(fileData), format);
    setChart(parsed);
  }, [fileData, format]);

  useEffect(() => {
    if (!chart) {
      return;
    }

    setParsedMidi(
      parserVersion === 'v2'
        ? new ChartParserV2(chart, isFiveLane, difficulty)
        : new ChartParserV1(chart, isFiveLane, difficulty),
    );
  }, [chart, isFiveLane, difficulty, parserVersion]);

  useEffect(() => {
    if (!vexflowContainerRef.current || !parsedMidi) {
      return;
    }

    if (parserVersion === 'v2' && !(parsedMidi instanceof ChartParserV2)) {
      return;
    }
    if (parserVersion === 'v1' && !(parsedMidi instanceof ChartParserV1)) {
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
            parsedMidi as ChartParserV2,
            showBarNumbers,
            enableColors,
          )
        : renderMusicV1(
            vexflowContainerRef,
            parsedMidi as ChartParserV1,
            showBarNumbers,
            enableColors,
          ),
    );
  }, [parsedMidi, showBarNumbers, enableColors, parserVersion]);

  useEffect(() => {
    if (!chart || !renderData) {
      return;
    }

    highlightsRef.current = renderData.map(() =>
      createRef<HTMLButtonElement>(),
    );

    const currentTick = secondsToTicks(
      currentTime,
      chart.resolution,
      chart.tempos,
    );
    const highlightedMeasure = renderData.find(
      ({ measure }) =>
        currentTick >= measure.startTick && currentTick < measure.endTick,
    );

    if (!highlightedMeasure) {
      return;
    }

    setHighlightedMeasureIndex(renderData.indexOf(highlightedMeasure));
  }, [currentTime, chart, renderData]);

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

  return (
    <Wrapper ref={containerRef}>
      <VexflowContainer ref={vexflowContainerRef} />
      {measureHighlights}
    </Wrapper>
  );
}
