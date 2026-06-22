import {
  RefObject,
  createRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ParsedChart, RenderData } from '../../chart-parser/types';
import { PlayheadStyle } from '../types';
import { ActiveNoteInfo } from './types';
import { getCursorX, getNoteSvg } from '../views/utils';

export interface CursorPosition {
  left: number;
  top: number;
  height: number;
}

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  let el = node?.parentElement ?? null;

  while (el) {
    const { overflowY } = getComputedStyle(el);

    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight
    ) {
      return el;
    }

    el = el.parentElement;
  }

  return null;
}

interface UsePlayheadParams {
  chart: ParsedChart | null;
  currentTime: number;
  currentTick: number | null;
  renderData: RenderData[];
  playheadStyle: PlayheadStyle;
}

interface UsePlayheadResult {
  highlightedMeasureIndex: number;
  cursorPosition: CursorPosition | null;
  activeNoteInfo: ActiveNoteInfo | null;
  highlightsRef: RefObject<HTMLDivElement | null>[];
}

export function usePlayhead({
  chart,
  currentTime,
  currentTick,
  renderData,
  playheadStyle,
}: UsePlayheadParams): UsePlayheadResult {
  const [highlightedMeasureIndex, setHighlightedMeasureIndex] = useState(-1);
  const highlightsRef = useMemo(
    () => renderData.map(() => createRef<HTMLDivElement>()),
    [renderData],
  );
  const cursorPosition = useMemo<CursorPosition | null>(() => {
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

  const scrollParentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (playheadStyle === 'None' || highlightedMeasureIndex < 0) {
      return;
    }

    const el = highlightsRef[highlightedMeasureIndex]?.current;

    if (!el) {
      return;
    }

    const scrollParent =
      scrollParentRef.current ??
      (scrollParentRef.current = getScrollParent(el));

    if (!scrollParent) {
      return;
    }

    const elRect = el.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    const margin = parentRect.height * 0.25;
    const outOfView =
      elRect.top < parentRect.top + margin ||
      elRect.bottom > parentRect.bottom - margin;

    if (outOfView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightsRef, highlightedMeasureIndex, playheadStyle]);

  return {
    highlightedMeasureIndex,
    cursorPosition,
    activeNoteInfo,
    highlightsRef,
  };
}
