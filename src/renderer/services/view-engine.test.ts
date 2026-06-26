import { describe, expect, it } from 'vitest';
import { Stave, StaveNote } from 'vexflow';
import {
  Measure,
  ParsedChart,
  RenderData,
  RenderedNote,
} from '../../chart-parser/types';
import { ViewEngine } from './view-engine';

const HIT = 'rgba(0, 0, 0, 0)';
const MISSED = 'rgb(160, 152, 144)';
const SCALE = 'scale(1.5)';
const CHART = {
  resolution: 480,
  tempos: [{ tick: 0, beatsPerMinute: 120, msTime: 0 }],
} as unknown as ParsedChart;

function svgEl(): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  el.style.fill = '';

  return el as SVGElement;
}

function staveNote(
  keys: string[],
  {
    isRest = false,
    heads = keys.length,
  }: { isRest?: boolean; heads?: number } = {},
): StaveNote {
  const noteHeads = Array.from({ length: heads }, () => {
    const el = svgEl();

    return { getSVGElement: () => el };
  });

  return {
    isRest: () => isRest,
    getKeys: () => keys,
    getAbsoluteX: () => 0,
    noteHeads,
  } as unknown as StaveNote;
}

function fakeStave(): Stave {
  return {
    getX: () => 0,
    getY: () => 10,
    getWidth: () => 100,
    getHeight: () => 40,
  } as unknown as Stave;
}

function rendered(tick: number, note: StaveNote): RenderedNote {
  return { tick, note };
}

function measureData(
  startTick: number,
  endTick: number,
  notes: RenderedNote[],
): RenderData {
  return {
    stave: fakeStave(),
    measure: { startTick, endTick } as unknown as Measure,
    renderedNotes: notes,
  };
}

function div(): HTMLElement {
  return document.createElement('div');
}

function fill(note: StaveNote, head = 0): string {
  return (note.noteHeads[head].getSVGElement() as SVGElement).style.fill;
}

function transform(note: StaveNote, head = 0): string {
  return (note.noteHeads[head].getSVGElement() as SVGElement).style.transform;
}

interface SetupOptions {
  playheadStyle?: 'Cursor' | 'Measure' | 'None';
  progressColoring?: boolean;
  isHit?: (tick: number, prefix: string) => boolean;
  cursorEl?: HTMLElement;
  highlightEls?: (HTMLElement | undefined)[];
}

function setup(
  renderData: RenderData[],
  options: SetupOptions = {},
): ViewEngine {
  const {
    playheadStyle = 'Cursor',
    progressColoring = false,
    isHit = () => false,
    cursorEl,
    highlightEls = [],
  } = options;
  const view = new ViewEngine(isHit);

  view.setContext({ chart: CHART, renderData });
  view.setSettings(playheadStyle, progressColoring);
  view.setRefs({ cursorEl, highlightEls });

  return view;
}

describe('ViewEngine', () => {
  it('moves the measure highlight forward as the tick crosses measures', () => {
    const a = div();
    const b = div();
    const view = setup(
      [
        measureData(0, 1920, [
          rendered(0, staveNote(['c/5'], { isRest: true })),
        ]),
        measureData(1920, 3840, [
          rendered(1920, staveNote(['c/5'], { isRest: true })),
        ]),
      ],
      { playheadStyle: 'Measure', highlightEls: [a, b] },
    );

    view.render(0, 480);

    expect(a.style.border).toContain('var(--color-accent)');
    expect(b.style.border).toBe('');

    view.render(0, 2016);

    expect(b.style.border).toContain('var(--color-accent)');
    expect(a.style.backgroundColor).toBe('');
  });

  it('updates the cursor position every frame within a measure', () => {
    const cursor = div();
    const view = setup(
      [
        measureData(0, 1920, [
          rendered(0, staveNote(['c/5'], { isRest: true })),
        ]),
      ],
      { cursorEl: cursor },
    );

    view.render(0.5, 480);
    expect(cursor.style.transform).toBe(
      'translate3d(25px, 10px, 0) translateX(-50%)',
    );

    view.render(1, 960);
    expect(cursor.style.transform).toBe(
      'translate3d(50px, 10px, 0) translateX(-50%)',
    );
  });

  it('scales the active note and unscales the previous one on a crossing', () => {
    const n0 = staveNote(['c/5']);
    const n1 = staveNote(['d/5']);
    const view = setup([
      measureData(0, 1920, [rendered(0, n0), rendered(480, n1)]),
    ]);

    view.render(0, 0);
    expect(transform(n0)).toBe(SCALE);
    expect(transform(n1)).toBe('');

    view.render(0, 480);
    expect(transform(n1)).toBe(SCALE);
    expect(transform(n0)).toBe('');
  });

  it('progress-colours notes before the active note', () => {
    const n0 = staveNote(['c/5']);
    const n1 = staveNote(['d/5']);
    const n2 = staveNote(['e/5']);
    const view = setup(
      [
        measureData(0, 1920, [
          rendered(0, n0),
          rendered(240, n1),
          rendered(480, n2),
        ]),
      ],
      { progressColoring: true },
    );

    view.render(0, 480);

    expect(fill(n0)).toBe(MISSED);
    expect(fill(n1)).toBe(MISSED);
    expect(fill(n2)).toBe('');
  });

  it('clears colouring when the playhead is seeked backward', () => {
    const n0 = staveNote(['c/5']);
    const n1 = staveNote(['d/5']);
    const n2 = staveNote(['e/5']);
    const view = setup(
      [
        measureData(0, 1920, [
          rendered(0, n0),
          rendered(240, n1),
          rendered(480, n2),
        ]),
      ],
      { progressColoring: true },
    );

    view.render(0, 480);
    expect(fill(n0)).toBe(MISSED);

    view.render(0, 0);
    expect(fill(n0)).toBe('');
    expect(fill(n1)).toBe('');
  });

  it('uses the isHit predicate to colour passed notes hit or missed', () => {
    const n0 = staveNote(['c/5']);
    const n1 = staveNote(['d/5']);
    const isHit = (tick: number, prefix: string) =>
      tick === 0 && prefix === 'c/5';
    const view = setup(
      [measureData(0, 1920, [rendered(0, n0), rendered(240, n1)])],
      { progressColoring: true, isHit },
    );

    view.render(0, 240);

    expect(fill(n0)).toBe(HIT);
  });

  it('paints a struck note head only for the matching prefix', () => {
    const note = staveNote(['c/5', 'g/5']);
    const view = setup([], { progressColoring: true });

    view.paintHit(note, ['c/5']);

    expect(fill(note, 0)).toBe(HIT);
    expect(fill(note, 1)).toBe('');
  });

  it('does not paint hits when progress colouring is off', () => {
    const note = staveNote(['c/5']);
    const view = setup([], { progressColoring: false });

    view.paintHit(note, ['c/5']);

    expect(fill(note)).toBe('');
  });

  it('hides the cursor and skips scaling when the style is None', () => {
    const cursor = div();
    const n0 = staveNote(['c/5']);
    const view = setup([measureData(0, 1920, [rendered(0, n0)])], {
      playheadStyle: 'None',
      cursorEl: cursor,
    });

    view.render(0, 0);

    expect(cursor.style.display).toBe('none');
    expect(transform(n0)).toBe('');
  });

  it('clears colouring while the playhead sits on a note-head-less rest', () => {
    const n0 = staveNote(['c/5']);
    const n1 = staveNote(['d/5']);
    const rest = staveNote(['e/5'], { heads: 0 });
    const view = setup(
      [
        measureData(0, 1920, [
          rendered(0, n0),
          rendered(240, n1),
          rendered(480, rest),
        ]),
      ],
      { progressColoring: true },
    );

    view.render(0, 240);
    expect(fill(n0)).toBe(MISSED);

    view.render(0, 480);
    expect(fill(n0)).toBe('');
  });
});
