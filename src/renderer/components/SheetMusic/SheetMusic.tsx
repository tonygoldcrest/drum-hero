import {
  RefObject,
  createRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { parseChartFile } from 'scan-chart';

import {
  CursorLine,
  MeasureHighlight,
  VexflowContainer,
  Wrapper,
} from './styles';
import { ChartParser } from '../../../chart-parser/parser';
import { renderMusic } from '../../../chart-parser/renderer';
import {
  Difficulty,
  ParsedChart,
  RenderData,
} from '../../../chart-parser/types';
import { PlayheadStyle } from '../../views/SongView/types';
import {
  getCursorX,
  getNoteSvg,
  secondsToTicks,
  ticksToSeconds,
} from './utils';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const highlightsRef = useRef<RefObject<HTMLButtonElement>[]>([]);
  const vexflowContainerRef = useRef<HTMLDivElement>(null);
  const [parsedMidi, setParsedMidi] = useState<ChartParser | null>(null);
  const [chart, setChart] = useState<ParsedChart | null>(null);
  const [renderData, setRenderData] = useState<RenderData[]>([]);
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

    setParsedMidi(new ChartParser(chart, isFiveLane, difficulty));
  }, [chart, isFiveLane, difficulty]);

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
    if (playheadStyle === 'None' || highlightedMeasureIndex < 0) {
      return;
    }

    highlightsRef.current[highlightedMeasureIndex]?.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [highlightedMeasureIndex, playheadStyle]);

  const activeNoteInfo = useMemo(() => {
    if (playheadStyle === 'None' || !chart || highlightedMeasureIndex < 0) {
      return null;
    }

    const measureData = renderData[highlightedMeasureIndex];

    if (!measureData) {
      return null;
    }

    const currentTick = secondsToTicks(
      currentTime,
      chart.resolution,
      chart.tempos,
    );
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
  }, [playheadStyle, chart, currentTime, renderData, highlightedMeasureIndex]);

  const prevActiveNoteRef = useRef<{
    key: string;
    noteHeadEls: SVGElement[];
  } | null>(null);

  const applyTransform = (el: SVGElement, transform: string) => {
    const g = el as SVGGraphicsElement;
    g.style.transformBox = 'fill-box';

    g.style.transformOrigin = 'center';
    g.style.transition = 'transform 0.08s ease-out';
    g.style.transform = transform;
  };

  useEffect(() => {
    const prev = prevActiveNoteRef.current;

    if (!activeNoteInfo) {
      if (prev) {
        prev.noteHeadEls.forEach((el) => applyTransform(el, ''));
        prevActiveNoteRef.current = null;
      }
      return;
    }

    if (prev?.key === activeNoteInfo.key) {
      return;
    }

    if (prev) {
      prev.noteHeadEls.forEach((el) => applyTransform(el, ''));
    }

    activeNoteInfo.noteHeadEls.forEach((el) =>
      applyTransform(el, 'scale(1.5)'),
    );

    prevActiveNoteRef.current = activeNoteInfo;
  }, [activeNoteInfo]);

  useEffect(() => {
    prevActiveNoteRef.current = null;
  }, [renderData]);

  const decolorizedElsRef = useRef<Set<SVGElement>>(new Set());
  const prevDecolorizedKeyRef = useRef<string | null>(null);
  const prevDecolorizedPosRef = useRef<{
    measureIdx: number;
    noteIdx: number;
  } | null>(null);

  useEffect(() => {
    if (activeNoteInfo?.key === prevDecolorizedKeyRef.current) {
      return;
    }

    const grey = (el: SVGElement) => {
      (el as SVGGraphicsElement).style.filter = 'grayscale(1) opacity(0.4)';
      decolorizedElsRef.current.add(el);
    };

    const clearAll = () => {
      decolorizedElsRef.current.forEach((el) => {
        (el as SVGGraphicsElement).style.filter = '';
      });
      decolorizedElsRef.current.clear();
    };

    if (!activeNoteInfo || playheadStyle === 'None') {
      clearAll();
      prevDecolorizedKeyRef.current = null;
      prevDecolorizedPosRef.current = null;
      return;
    }

    const {
      noteIdx,
      measureIdx,
      renderedNotes: curRenderedNotes,
    } = activeNoteInfo;
    const prev = prevDecolorizedPosRef.current;
    const isBackward =
      prev !== null &&
      (measureIdx < prev.measureIdx ||
        (measureIdx === prev.measureIdx && noteIdx < prev.noteIdx));

    if (isBackward) {
      clearAll();
      for (let m = 0; m < measureIdx; m++) {
        renderData[m]?.renderedNotes.forEach(({ note }) =>
          getNoteSvg(note).forEach(grey),
        );
      }

      for (let i = 0; i < noteIdx; i++) {
        getNoteSvg(curRenderedNotes[i].note).forEach(grey);
      }
    } else {
      const fromMeasure = prev?.measureIdx ?? 0;
      const fromNote = prev?.noteIdx ?? 0;

      if (fromMeasure === measureIdx) {
        for (let i = fromNote; i < noteIdx; i++) {
          getNoteSvg(curRenderedNotes[i].note).forEach(grey);
        }
      } else {
        const prevMeasureNotes = renderData[fromMeasure]?.renderedNotes ?? [];
        for (let i = fromNote; i < prevMeasureNotes.length; i++) {
          getNoteSvg(prevMeasureNotes[i].note).forEach(grey);
        }
        for (let m = fromMeasure + 1; m < measureIdx; m++) {
          renderData[m]?.renderedNotes.forEach(({ note }) =>
            getNoteSvg(note).forEach(grey),
          );
        }
        for (let i = 0; i < noteIdx; i++) {
          getNoteSvg(curRenderedNotes[i].note).forEach(grey);
        }
      }
    }

    prevDecolorizedKeyRef.current = activeNoteInfo.key;
    prevDecolorizedPosRef.current = { measureIdx, noteIdx };
  }, [activeNoteInfo, playheadStyle, renderData]);

  useEffect(() => {
    decolorizedElsRef.current.forEach((el) => {
      (el as SVGGraphicsElement).style.filter = '';
    });

    decolorizedElsRef.current.clear();
    prevDecolorizedKeyRef.current = null;
    prevDecolorizedPosRef.current = null;
  }, [renderData]);

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
      ref={highlightsRef.current[index]}
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
    <Wrapper ref={containerRef}>
      <VexflowContainer ref={vexflowContainerRef} />
      {measureHighlights}
      {cursorPosition && (
        <CursorLine
          style={{
            left: cursorPosition.left,
            top: cursorPosition.top,
            height: cursorPosition.height,
          }}
        ></CursorLine>
      )}
    </Wrapper>
  );
}
