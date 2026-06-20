import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { Stave } from 'vexflow';
import { renderMusic } from './renderer';
import { ChartParser } from './parser';
import { Measure, Note, ParsedChart } from './types';
import themedark from '../renderer/theme';

beforeAll(() => {
  (
    globalThis.SVGElement.prototype as unknown as {
      getBBox: () => DOMRect;
    }
  ).getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;
});

function note(overrides: Partial<Note> = {}): Note {
  return {
    notes: ['c/5'],
    duration: 'q',
    dots: 0,
    isRest: false,
    tick: 0,
    ...overrides,
  };
}

function measure(notes: Note[], overrides: Partial<Measure> = {}): Measure {
  return {
    timeSig: [4, 4],
    sigChange: true,
    hasClef: true,
    isCompound: false,
    startTick: 0,
    endTick: 768,
    notes,
    tuplets: [],
    ...overrides,
  };
}

function song(measures: Measure[]): ChartParser {
  return { measures } as ChartParser;
}

function ref(element: HTMLDivElement | null) {
  return { current: element } as React.RefObject<HTMLDivElement | null>;
}

function container() {
  const div = document.createElement('div');

  document.body.appendChild(div);

  return div;
}

const quarters: Note[] = [0, 192, 384, 576].map((tick) =>
  note({ tick, duration: 'q' }),
);

describe('renderMusic', () => {
  it('returns nothing when the element ref is empty', () => {
    expect(renderMusic(ref(null), song([measure(quarters)]))).toEqual([]);
  });

  it('renders an SVG into the element', () => {
    const div = container();

    renderMusic(ref(div), song([measure(quarters)]));

    expect(div.querySelector('svg')).not.toBeNull();
  });

  it('returns one render entry per measure', () => {
    const div = container();
    const measures = [
      measure(quarters),
      measure([note({ notes: ['b/4'], duration: 'w', isRest: true })], {
        hasClef: false,
        sigChange: false,
      }),
    ];
    const data = renderMusic(ref(div), song(measures));

    expect(data).toHaveLength(2);
    expect(data[0].measure).toBe(measures[0]);
    expect(data[1].measure).toBe(measures[1]);
    expect(data[0].stave).toBeInstanceOf(Stave);
  });

  it('emits a rendered note for every note in a measure, ticks preserved', () => {
    const div = container();
    const notes = [
      note({ tick: 0 }),
      note({ tick: 96, duration: '8' }),
      note({ notes: ['b/4'], duration: 'q', isRest: true, tick: 288 }),
      note({ tick: 384, notes: ['f/4', 'c/5'] }),
    ];
    const data = renderMusic(ref(div), song([measure(notes)]));

    expect(data[0].renderedNotes).toHaveLength(notes.length);
    expect(data[0].renderedNotes.map((rn) => rn.tick)).toEqual([
      0, 96, 288, 384,
    ]);
  });

  it('lays staves out two per row', () => {
    const div = container();
    const measures = [
      measure(quarters),
      measure(quarters, { hasClef: false, sigChange: false }),
      measure(quarters, { hasClef: false, sigChange: false }),
    ];
    const data = renderMusic(ref(div), song(measures));
    const ys = data.map((d) => d.stave.getYForLine(0));

    expect(data[0].stave.getX()).toBe(0);
    expect(data[1].stave.getX()).toBe(600);
    expect(data[2].stave.getX()).toBe(0);
    expect(ys[0]).toBe(ys[1]);
    expect(ys[2]).toBeGreaterThan(ys[0]);
  });

  it('colours note heads with the per-drum colour when enabled', () => {
    const div = container();

    renderMusic(
      ref(div),
      song([measure([note({ notes: ['c/5'] })])]),
      true,
      true,
    );

    expect(div.querySelector('svg')!.innerHTML).toContain(themedark.color.red);
  });

  it('does not colour note heads when colours are disabled', () => {
    const div = container();

    renderMusic(
      ref(div),
      song([measure([note({ notes: ['c/5'] })])]),
      true,
      false,
    );

    expect(div.querySelector('svg')!.innerHTML).not.toContain(
      themedark.color.red,
    );
  });

  it('renders bar numbers when requested and omits them otherwise', () => {
    const withNumbers = container();
    const withoutNumbers = container();

    renderMusic(ref(withNumbers), song([measure(quarters)]), true);
    renderMusic(ref(withoutNumbers), song([measure(quarters)]), false);

    const textOf = (div: HTMLDivElement) =>
      Array.from(div.querySelectorAll('svg text')).map((el) => el.textContent);

    expect(textOf(withNumbers)).toContain('0');
    expect(textOf(withoutNumbers)).not.toContain('0');
  });

  it('renders flam grace notes without dropping the main note', () => {
    const div = container();
    const notes = [
      note({ tick: 0, notes: ['c/5'], graceNotes: [['c/5']] }),
      note({ tick: 192, duration: 'q' }),
    ];
    const data = renderMusic(ref(div), song([measure(notes)]));

    expect(data[0].renderedNotes).toHaveLength(2);
    expect(div.querySelector('svg')).not.toBeNull();
  });

  it('renders a tuplet group spanning its notes', () => {
    const div = container();
    const tripletNotes = [0, 64, 128].map((tick) =>
      note({ tick, duration: '8', tupletId: 0 }),
    );
    const measures = [
      measure(tripletNotes, {
        tuplets: [{ id: 0, numNotes: 3, notesOccupied: 2 }],
      }),
    ];
    const data = renderMusic(ref(div), song(measures));

    expect(data[0].renderedNotes).toHaveLength(3);
    expect(div.querySelector('svg')).not.toBeNull();
  });

  it('renders real parser output end to end', () => {
    const div = container();
    const chart = {
      resolution: 192,
      timeSignatures: [],
      trackData: [
        {
          instrument: 'drums',
          difficulty: 'expert',
          noteEventGroups: [0, 96, 192, 384, 576].map((tick) => [
            { tick, type: 14, flags: 0, length: 0 },
          ]),
        },
      ],
    } as unknown as ParsedChart;
    const parser = new ChartParser(chart, false);
    const data = renderMusic(ref(div), parser);

    expect(data).toHaveLength(parser.measures.length);
    data.forEach((entry, index) => {
      expect(entry.renderedNotes).toHaveLength(
        parser.measures[index].notes.length,
      );
    });
  });
});
