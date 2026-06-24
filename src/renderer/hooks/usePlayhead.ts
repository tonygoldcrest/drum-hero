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

function findMeasureIndex(renderData: RenderData[], tick: number): number {
  let lo = 0;
  let hi = renderData.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const { measure } = renderData[mid];

    if (tick < measure.startTick) {
      hi = mid - 1;
    } else if (tick >= measure.endTick) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }

  return -1;
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

  if (currentTick !== null) {
    const index = findMeasureIndex(renderData, currentTick);

    if (index >= 0 && index !== highlightedMeasureIndex) {
      setHighlightedMeasureIndex(index);
    }
  }

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
  const activeNoteIdx = useMemo(() => {
    if (
      playheadStyle === 'None' ||
      currentTick === null ||
      highlightedMeasureIndex < 0
    ) {
      return -1;
    }

    const measureData = renderData[highlightedMeasureIndex];

    if (!measureData) {
      return -1;
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

    return noteIdx;
  }, [playheadStyle, currentTick, renderData, highlightedMeasureIndex]);
  const activeNoteInfo = useMemo<ActiveNoteInfo | null>(() => {
    if (activeNoteIdx < 0 || highlightedMeasureIndex < 0) {
      return null;
    }

    const measureData = renderData[highlightedMeasureIndex];

    if (!measureData) {
      return null;
    }

    const { renderedNotes } = measureData;
    const noteSvgs = getNoteSvg(renderedNotes[activeNoteIdx].note);

    if (noteSvgs.length === 0) {
      return null;
    }

    return {
      key: `${highlightedMeasureIndex}-${activeNoteIdx}`,
      noteHeadEls: noteSvgs,
      noteIdx: activeNoteIdx,
      measureIdx: highlightedMeasureIndex,
      renderedNotes,
    };
  }, [activeNoteIdx, highlightedMeasureIndex, renderData]);
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
