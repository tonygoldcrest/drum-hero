import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StaveNote } from 'vexflow';
import {
  ParsedChart,
  RenderData,
  RenderedNote,
} from '../../chart-parser/types';
import { PlayheadStyle } from '../types';
import { usePlayhead } from './usePlayhead';

vi.mock('../views/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../views/utils')>();

  return { ...actual, getCursorX: vi.fn(() => 42) };
});

const CHART = {} as unknown as ParsedChart;

function svgEl(): SVGElement {
  return document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
  ) as SVGElement;
}

function fakeNote(keys = ['c/5'], isRest = false): StaveNote {
  const noteHeads = keys.map(() => {
    const el = svgEl();

    return { getSVGElement: () => el };
  });

  return {
    isRest: () => isRest,
    getKeys: () => keys,
    noteHeads,
  } as unknown as StaveNote;
}

function fakeStave({ x = 0, y = 10, width = 100, height = 50 } = {}) {
  return {
    getX: () => x,
    getY: () => y,
    getWidth: () => width,
    getHeight: () => height,
  };
}

function measure(
  startTick: number,
  endTick: number,
  notes: RenderedNote[] = [],
  stave = fakeStave(),
): RenderData {
  return {
    measure: { startTick, endTick },
    stave,
    renderedNotes: notes,
  } as unknown as RenderData;
}

interface Props {
  currentTime: number;
  currentTick: number | null;
  renderData: RenderData[];
  playheadStyle: PlayheadStyle;
}

function setup(initial: Props) {
  return renderHook(
    ({ currentTime, currentTick, renderData, playheadStyle }: Props) =>
      usePlayhead({
        chart: CHART,
        currentTime,
        currentTick,
        renderData,
        playheadStyle,
      }),
    { initialProps: initial },
  );
}

describe('usePlayhead', () => {
  it('highlights the measure containing the current tick', () => {
    const data = [measure(0, 480), measure(480, 960)];
    const { result, rerender } = setup({
      currentTime: 0,
      currentTick: 100,
      renderData: data,
      playheadStyle: 'Measure',
    });

    expect(result.current.highlightedMeasureIndex).toBe(0);

    rerender({
      currentTime: 0,
      currentTick: 500,
      renderData: data,
      playheadStyle: 'Measure',
    });

    expect(result.current.highlightedMeasureIndex).toBe(1);
  });

  it('does not highlight a measure when the current tick is null', () => {
    const { result } = setup({
      currentTime: 0,
      currentTick: null,
      renderData: [measure(0, 480)],
      playheadStyle: 'Measure',
    });

    expect(result.current.highlightedMeasureIndex).toBe(-1);
  });

  it('exposes a cursor position only in Cursor mode', () => {
    const data = [measure(0, 480)];
    const measureMode = setup({
      currentTime: 1,
      currentTick: 100,
      renderData: data,
      playheadStyle: 'Measure',
    });

    expect(measureMode.result.current.cursorPosition).toBeNull();

    const { result } = setup({
      currentTime: 1,
      currentTick: 100,
      renderData: data,
      playheadStyle: 'Cursor',
    });

    expect(result.current.cursorPosition).toEqual({
      left: 42,
      top: 10,
      height: 80,
    });
  });

  it('has no active note in None mode', () => {
    const data = [measure(0, 480, [{ tick: 0, note: fakeNote() }])];
    const { result } = setup({
      currentTime: 0,
      currentTick: 100,
      renderData: data,
      playheadStyle: 'None',
    });

    expect(result.current.activeNoteInfo).toBeNull();
  });

  it('selects the last note at or before the current tick', () => {
    const data = [
      measure(0, 480, [
        { tick: 0, note: fakeNote(['c/5']) },
        { tick: 240, note: fakeNote(['g/5']) },
      ]),
    ];
    const { result } = setup({
      currentTime: 0,
      currentTick: 300,
      renderData: data,
      playheadStyle: 'Cursor',
    });
    const info = result.current.activeNoteInfo;

    expect(info).not.toBeNull();
    expect(info?.noteIdx).toBe(1);
    expect(info?.measureIdx).toBe(0);
    expect(info?.key).toBe('0-1');
    expect(info?.noteHeadEls).toHaveLength(1);
  });

  it('has no active note when none precedes the current tick', () => {
    const data = [measure(0, 480, [{ tick: 100, note: fakeNote() }])];
    const { result } = setup({
      currentTime: 0,
      currentTick: 50,
      renderData: data,
      playheadStyle: 'Cursor',
    });

    expect(result.current.activeNoteInfo).toBeNull();
  });

  it('scrolls the newly highlighted measure into view', () => {
    const data = [measure(0, 480), measure(480, 960)];
    const { result, rerender } = setup({
      currentTime: 0,
      currentTick: 100,
      renderData: data,
      playheadStyle: 'Measure',
    });
    const scrollIntoView = vi.fn();

    result.current.highlightsRef[1].current = {
      scrollIntoView,
    } as unknown as HTMLDivElement;

    rerender({
      currentTime: 0,
      currentTick: 500,
      renderData: data,
      playheadStyle: 'Measure',
    });

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });
});
