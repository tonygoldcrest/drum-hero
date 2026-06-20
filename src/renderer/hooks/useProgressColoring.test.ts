import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { StaveNote } from 'vexflow';
import { RenderData } from '../../chart-parser/types';
import { PlayheadStyle } from '../types';
import { useProgressColoring } from './useProgressColoring';
import { ActiveNoteInfo } from './types';

const HIT_RGBA = 'rgba(0, 0, 0, 0)';
const MISSED_NOTE_COLOR = 'rgb(160, 152, 144)';

function fakeNote(keys: string[]): StaveNote {
  const noteHeads = keys.map(() => {
    const el = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    ) as SVGElement;

    el.style.fill = '';

    return { getSVGElement: () => el };
  });

  return {
    getKeys: () => keys,
    noteHeads,
  } as unknown as StaveNote;
}

function buildData(
  measures: { keys: string[]; tick: number }[][],
): RenderData[] {
  return measures.map(
    (notes) =>
      ({
        renderedNotes: notes.map(({ keys, tick }) => ({
          tick,
          note: fakeNote(keys),
        })),
      }) as unknown as RenderData,
  );
}

function fill(rd: RenderData[], m: number, n: number, head = 0): string {
  return (
    rd[m].renderedNotes[n].note.noteHeads[head].getSVGElement() as SVGElement
  ).style.fill;
}

function active(
  rd: RenderData[],
  measureIdx: number,
  noteIdx: number,
  key: string,
): ActiveNoteInfo {
  return {
    key,
    noteHeadEls: [],
    noteIdx,
    measureIdx,
    renderedNotes: rd[measureIdx].renderedNotes,
  };
}

interface Props {
  activeNote: ActiveNoteInfo | null;
  playheadStyle: PlayheadStyle;
  enabled: boolean;
}

function setup(
  rd: RenderData[],
  hitKeys: { current: Set<string> },
  initial: Props,
) {
  return renderHook(
    ({ activeNote, playheadStyle, enabled }: Props) =>
      useProgressColoring(activeNote, playheadStyle, rd, enabled, hitKeys),
    { initialProps: initial },
  );
}

const NO_HITS = { current: new Set<string>() };
let rd: RenderData[];

beforeEach(() => {
  rd = buildData([
    [
      { keys: ['c/5'], tick: 0 },
      { keys: ['d/5'], tick: 1 },
      { keys: ['e/5'], tick: 2 },
    ],
    [
      { keys: ['f/5'], tick: 100 },
      { keys: ['g/5'], tick: 101 },
      { keys: ['a/5'], tick: 102 },
    ],
  ]);
});

describe('useProgressColoring', () => {
  it('colours notes before the active note within a measure', () => {
    const { rerender } = setup(rd, NO_HITS, {
      activeNote: active(rd, 0, 0, 'm0-0'),
      playheadStyle: 'Cursor',
      enabled: true,
    });

    act(() =>
      rerender({
        activeNote: active(rd, 0, 2, 'm0-2'),
        playheadStyle: 'Cursor',
        enabled: true,
      }),
    );

    expect(fill(rd, 0, 0)).toBe(MISSED_NOTE_COLOR);
    expect(fill(rd, 0, 1)).toBe(MISSED_NOTE_COLOR);
    expect(fill(rd, 0, 2)).toBe('');
  });

  it('does not colour anything when disabled', () => {
    setup(rd, NO_HITS, {
      activeNote: active(rd, 0, 2, 'm0-2'),
      playheadStyle: 'Cursor',
      enabled: false,
    });

    expect(fill(rd, 0, 0)).toBe('');
    expect(fill(rd, 0, 1)).toBe('');
  });

  it('does not colour anything when the playhead style is None', () => {
    setup(rd, NO_HITS, {
      activeNote: active(rd, 0, 2, 'm0-2'),
      playheadStyle: 'None',
      enabled: true,
    });

    expect(fill(rd, 0, 0)).toBe('');
  });

  it('colours full earlier measures and the start of the current one', () => {
    setup(rd, NO_HITS, {
      activeNote: active(rd, 1, 1, 'm1-1'),
      playheadStyle: 'Cursor',
      enabled: true,
    });

    expect(fill(rd, 0, 0)).toBe(MISSED_NOTE_COLOR);
    expect(fill(rd, 0, 1)).toBe(MISSED_NOTE_COLOR);
    expect(fill(rd, 0, 2)).toBe(MISSED_NOTE_COLOR);
    expect(fill(rd, 1, 0)).toBe(MISSED_NOTE_COLOR);
    expect(fill(rd, 1, 1)).toBe('');
    expect(fill(rd, 1, 2)).toBe('');
  });

  it('uses the hit colour for notes that were hit', () => {
    const hitKeys = { current: new Set(['0:c/5']) };

    setup(rd, hitKeys, {
      activeNote: active(rd, 0, 2, 'm0-2'),
      playheadStyle: 'Cursor',
      enabled: true,
    });

    expect(fill(rd, 0, 0)).toBe(HIT_RGBA);
    expect(fill(rd, 0, 1)).toBe(MISSED_NOTE_COLOR);
  });

  it('clears colouring of notes ahead when the playhead moves back', () => {
    const { rerender } = setup(rd, NO_HITS, {
      activeNote: active(rd, 1, 2, 'm1-2'),
      playheadStyle: 'Cursor',
      enabled: true,
    });

    expect(fill(rd, 0, 0)).toBe(MISSED_NOTE_COLOR);
    expect(fill(rd, 1, 0)).toBe(MISSED_NOTE_COLOR);

    act(() =>
      rerender({
        activeNote: active(rd, 0, 1, 'm0-1'),
        playheadStyle: 'Cursor',
        enabled: true,
      }),
    );

    expect(fill(rd, 0, 0)).toBe(MISSED_NOTE_COLOR);
    expect(fill(rd, 0, 1)).toBe('');
    expect(fill(rd, 0, 2)).toBe('');
    expect(fill(rd, 1, 0)).toBe('');
    expect(fill(rd, 1, 2)).toBe('');
  });

  it('clears all colouring when the active note disappears', () => {
    const { rerender } = setup(rd, NO_HITS, {
      activeNote: active(rd, 0, 2, 'm0-2'),
      playheadStyle: 'Cursor',
      enabled: true,
    });

    expect(fill(rd, 0, 0)).toBe(MISSED_NOTE_COLOR);

    act(() =>
      rerender({
        activeNote: null,
        playheadStyle: 'Cursor',
        enabled: true,
      }),
    );

    expect(fill(rd, 0, 0)).toBe('');
    expect(fill(rd, 0, 1)).toBe('');
  });

  it('does not recolour when the active key is unchanged', () => {
    const { rerender } = setup(rd, NO_HITS, {
      activeNote: active(rd, 0, 2, 'same'),
      playheadStyle: 'Cursor',
      enabled: true,
    });

    rd[0].renderedNotes[2].note.noteHeads[0].getSVGElement()!.style.fill =
      'sentinel';

    act(() =>
      rerender({
        activeNote: active(rd, 1, 2, 'same'),
        playheadStyle: 'Cursor',
        enabled: true,
      }),
    );

    expect(fill(rd, 1, 0)).toBe('');
  });

  it('colours chords across every note head', () => {
    const chordData = buildData([
      [
        { keys: ['c/5', 'g/5'], tick: 0 },
        { keys: ['d/5'], tick: 1 },
      ],
    ]);

    setup(chordData, NO_HITS, {
      activeNote: active(chordData, 0, 1, 'c0-1'),
      playheadStyle: 'Cursor',
      enabled: true,
    });

    expect(fill(chordData, 0, 0, 0)).toBe(MISSED_NOTE_COLOR);
    expect(fill(chordData, 0, 0, 1)).toBe(MISSED_NOTE_COLOR);
  });
});
