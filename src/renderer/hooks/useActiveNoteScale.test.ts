import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RenderData } from '../../chart-parser/types';
import { useActiveNoteScale } from './useActiveNoteScale';
import { ActiveNoteInfo } from './types';

function svg(): SVGElement {
  return document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
  ) as SVGElement;
}

function note(key: string, els: SVGElement[]): ActiveNoteInfo {
  return {
    key,
    noteHeadEls: els,
    noteIdx: 0,
    measureIdx: 0,
    renderedNotes: [],
  };
}

const EMPTY: RenderData[] = [];

describe('useActiveNoteScale', () => {
  it('scales the active note heads', () => {
    const el = svg();

    renderHook(() => useActiveNoteScale(note('a', [el]), EMPTY));

    expect(el.style.transform).toBe('scale(1.5)');
    expect(el.style.transformOrigin).toBe('center');
  });

  it('does nothing when there is no active note', () => {
    const el = svg();

    renderHook(() => useActiveNoteScale(null, EMPTY));

    expect(el.style.transform).toBe('');
  });

  it('clears the transform when the active note becomes null', () => {
    const el = svg();
    const { rerender } = renderHook(
      ({ active }: { active: ActiveNoteInfo | null }) =>
        useActiveNoteScale(active, EMPTY),
      { initialProps: { active: note('a', [el]) as ActiveNoteInfo | null } },
    );

    expect(el.style.transform).toBe('scale(1.5)');

    rerender({ active: null });

    expect(el.style.transform).toBe('');
  });

  it('moves the scale from the old note to the new one', () => {
    const a = svg();
    const b = svg();
    const { rerender } = renderHook(
      ({ active }: { active: ActiveNoteInfo }) =>
        useActiveNoteScale(active, EMPTY),
      { initialProps: { active: note('a', [a]) } },
    );

    rerender({ active: note('b', [b]) });

    expect(a.style.transform).toBe('');
    expect(b.style.transform).toBe('scale(1.5)');
  });

  it('does not re-apply when the key is unchanged', () => {
    const first = svg();
    const second = svg();
    const { rerender } = renderHook(
      ({ active }: { active: ActiveNoteInfo }) =>
        useActiveNoteScale(active, EMPTY),
      { initialProps: { active: note('a', [first]) } },
    );

    rerender({ active: note('a', [second]) });

    expect(second.style.transform).toBe('');
    expect(first.style.transform).toBe('scale(1.5)');
  });

  it('scales every note head in a chord', () => {
    const els = [svg(), svg(), svg()];

    renderHook(() => useActiveNoteScale(note('chord', els), EMPTY));

    els.forEach((el) => expect(el.style.transform).toBe('scale(1.5)'));
  });

  it('reset on renderData lets a matching key re-apply on a new note', () => {
    const first = svg();
    const second = svg();
    const { rerender } = renderHook(
      ({ active, data }: { active: ActiveNoteInfo; data: RenderData[] }) =>
        useActiveNoteScale(active, data),
      {
        initialProps: {
          active: note('a', [first]),
          data: [{}] as unknown as RenderData[],
        },
      },
    );

    expect(first.style.transform).toBe('scale(1.5)');

    rerender({
      active: note('a', [second]),
      data: [{}] as unknown as RenderData[],
    });

    expect(second.style.transform).toBe('scale(1.5)');
  });

  it('handles a sequence of active notes without leaking transforms', () => {
    const a = svg();
    const b = svg();
    const c = svg();
    const { rerender } = renderHook(
      ({ active }: { active: ActiveNoteInfo | null }) =>
        useActiveNoteScale(active, EMPTY),
      { initialProps: { active: note('a', [a]) as ActiveNoteInfo | null } },
    );

    rerender({ active: note('b', [b]) });
    rerender({ active: note('c', [c]) });
    rerender({ active: null });

    expect(a.style.transform).toBe('');
    expect(b.style.transform).toBe('');
    expect(c.style.transform).toBe('');
  });
});
