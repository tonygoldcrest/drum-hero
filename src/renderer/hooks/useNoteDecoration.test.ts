import { RefObject } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { StaveNote } from 'vexflow';
import { RenderData } from '../../chart-parser/types';
import { PlayheadStyle } from '../types';
import { HitHandler, useNoteDecoration } from './useNoteDecoration';
import { ActiveNoteInfo } from './types';

const HIT_RGBA = 'rgba(0, 0, 0, 0)';
const MISSED_NOTE_COLOR = 'rgb(160, 152, 144)';

function svg(): SVGElement {
  return document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
  ) as SVGElement;
}

function fakeNote(keys: string[]): StaveNote {
  const noteHeads = keys.map(() => {
    const el = svg();

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
  const onHitRef: RefObject<HitHandler | null> = { current: null };
  const view = renderHook(
    ({ activeNote, playheadStyle, enabled }: Props) =>
      useNoteDecoration(
        activeNote,
        playheadStyle,
        rd,
        enabled,
        hitKeys,
        onHitRef,
      ),
    { initialProps: initial },
  );

  return { ...view, onHitRef };
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

describe('useNoteDecoration — progress colouring', () => {
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

describe('useNoteDecoration — active note scale', () => {
  const EMPTY: RenderData[] = [];

  function scaleNote(key: string, els: SVGElement[]): ActiveNoteInfo {
    return {
      key,
      noteHeadEls: els,
      noteIdx: 0,
      measureIdx: 0,
      renderedNotes: [],
    };
  }

  function renderScale(
    activeNote: ActiveNoteInfo | null,
    data: RenderData[] = EMPTY,
  ) {
    const onHitRef: RefObject<HitHandler | null> = { current: null };

    return renderHook(
      ({ a, d }: { a: ActiveNoteInfo | null; d: RenderData[] }) =>
        useNoteDecoration(a, 'Cursor', d, true, NO_HITS, onHitRef),
      { initialProps: { a: activeNote, d: data } },
    );
  }

  it('scales the active note heads', () => {
    const el = svg();

    renderScale(scaleNote('a', [el]));

    expect(el.style.transform).toBe('scale(1.5)');
    expect(el.style.transformOrigin).toBe('center');
  });

  it('clears the transform when the active note becomes null', () => {
    const el = svg();
    const { rerender } = renderScale(scaleNote('a', [el]));

    expect(el.style.transform).toBe('scale(1.5)');

    act(() => rerender({ a: null, d: EMPTY }));

    expect(el.style.transform).toBe('');
  });

  it('moves the scale from the old note to the new one', () => {
    const a = svg();
    const b = svg();
    const { rerender } = renderScale(scaleNote('a', [a]));

    act(() => rerender({ a: scaleNote('b', [b]), d: EMPTY }));

    expect(a.style.transform).toBe('');
    expect(b.style.transform).toBe('scale(1.5)');
  });

  it('does not re-apply when the key is unchanged', () => {
    const first = svg();
    const second = svg();
    const { rerender } = renderScale(scaleNote('a', [first]));

    act(() => rerender({ a: scaleNote('a', [second]), d: EMPTY }));

    expect(second.style.transform).toBe('');
    expect(first.style.transform).toBe('scale(1.5)');
  });

  it('scales every note head in a chord', () => {
    const els = [svg(), svg(), svg()];

    renderScale(scaleNote('chord', els));

    els.forEach((el) => expect(el.style.transform).toBe('scale(1.5)'));
  });

  it('reset on renderData lets a matching key re-apply on a new note', () => {
    const first = svg();
    const second = svg();
    const data = [{}] as unknown as RenderData[];
    const { rerender } = renderScale(scaleNote('a', [first]), data);

    expect(first.style.transform).toBe('scale(1.5)');

    act(() =>
      rerender({
        a: scaleNote('a', [second]),
        d: [{}] as unknown as RenderData[],
      }),
    );

    expect(second.style.transform).toBe('scale(1.5)');
  });

  it('handles a sequence of active notes without leaking transforms', () => {
    const a = svg();
    const b = svg();
    const c = svg();
    const { rerender } = renderScale(scaleNote('a', [a]));

    act(() => rerender({ a: scaleNote('b', [b]), d: EMPTY }));
    act(() => rerender({ a: scaleNote('c', [c]), d: EMPTY }));
    act(() => rerender({ a: null, d: EMPTY }));

    expect(a.style.transform).toBe('');
    expect(b.style.transform).toBe('');
    expect(c.style.transform).toBe('');
  });
});

describe('useNoteDecoration — immediate hit hiding', () => {
  it('hides only the hit note heads as soon as onHit fires', () => {
    const note = fakeNote(['c/5', 'g/5']);
    const { onHitRef } = setup(rd, NO_HITS, {
      activeNote: active(rd, 0, 0, 'm0-0'),
      playheadStyle: 'Cursor',
      enabled: true,
    });

    act(() => onHitRef.current!(note, ['c/5']));

    expect((note.noteHeads[0].getSVGElement() as SVGElement).style.fill).toBe(
      HIT_RGBA,
    );
    expect((note.noteHeads[1].getSVGElement() as SVGElement).style.fill).toBe(
      '',
    );
  });

  it('does nothing when the feature is disabled', () => {
    const note = fakeNote(['c/5']);
    const { onHitRef } = setup(rd, NO_HITS, {
      activeNote: active(rd, 0, 0, 'm0-0'),
      playheadStyle: 'Cursor',
      enabled: false,
    });

    act(() => onHitRef.current!(note, ['c/5']));

    expect((note.noteHeads[0].getSVGElement() as SVGElement).style.fill).toBe(
      '',
    );
  });

  it('resets immediate-hit fills on a backward seek', () => {
    const note = fakeNote(['c/5']);
    const { onHitRef, rerender } = setup(rd, NO_HITS, {
      activeNote: active(rd, 1, 2, 'm1-2'),
      playheadStyle: 'Cursor',
      enabled: true,
    });

    act(() => onHitRef.current!(note, ['c/5']));
    expect((note.noteHeads[0].getSVGElement() as SVGElement).style.fill).toBe(
      HIT_RGBA,
    );

    act(() =>
      rerender({
        activeNote: active(rd, 0, 0, 'm0-0'),
        playheadStyle: 'Cursor',
        enabled: true,
      }),
    );

    expect((note.noteHeads[0].getSVGElement() as SVGElement).style.fill).toBe(
      '',
    );
  });

  it('a hit active note is both scaled and hidden', () => {
    const note = fakeNote(['c/5']);
    const el = note.noteHeads[0].getSVGElement() as SVGElement;
    const activeNote: ActiveNoteInfo = {
      key: 'm0-0',
      noteHeadEls: [el],
      noteIdx: 0,
      measureIdx: 0,
      renderedNotes: rd[0].renderedNotes,
    };
    const { onHitRef } = setup(rd, NO_HITS, {
      activeNote,
      playheadStyle: 'Cursor',
      enabled: true,
    });

    act(() => onHitRef.current!(note, ['c/5']));

    expect(el.style.transform).toBe('scale(1.5)');
    expect(el.style.fill).toBe(HIT_RGBA);
  });
});
