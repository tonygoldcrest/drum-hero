import { StaveNote } from 'vexflow';
import { describe, expect, it } from 'vitest';
import {
  Measure,
  ParsedChart,
  RenderData,
  RenderedNote,
} from '../../chart-parser/types';
import {
  calculateAccuracy,
  getCountIn,
  getCursorX,
  getNoteSvg,
  getStarRating,
  STAR_RATING_BANDS,
  secondsToTicks,
  ticksToSeconds,
} from './utils';

type Tempo = ParsedChart['tempos'][number];

function tempo(tick: number, beatsPerMinute: number, msTime: number): Tempo {
  return { tick, beatsPerMinute, msTime } as Tempo;
}

function fakeNote(absoluteX: number, isRest = false): StaveNote {
  return {
    isRest: () => isRest,
    getAbsoluteX: () => absoluteX,
  } as unknown as StaveNote;
}

function renderedNote(
  tick: number,
  absoluteX: number,
  isRest = false,
): RenderedNote {
  return { tick, note: fakeNote(absoluteX, isRest) } as unknown as RenderedNote;
}

function fakeStave(x: number, width: number) {
  return { getX: () => x, getWidth: () => width };
}

function measureData(
  startTick: number,
  endTick: number,
  notes: RenderedNote[],
  staveX = 0,
  staveWidth = 200,
): RenderData {
  return {
    measure: { startTick, endTick },
    stave: fakeStave(staveX, staveWidth),
    renderedNotes: notes,
  } as unknown as RenderData;
}

describe('ticksToSeconds', () => {
  it('returns 0 at tick 0', () => {
    expect(ticksToSeconds(0, 1, [tempo(0, 60, 0)])).toBe(0);
  });

  it('converts ticks linearly within a single tempo segment', () => {
    expect(ticksToSeconds(1, 1, [tempo(0, 60, 0)])).toBe(1);
    expect(ticksToSeconds(2, 1, [tempo(0, 60, 0)])).toBe(2);
  });

  it('uses the tempo segment whose tick is <= the target tick', () => {
    const tempos = [tempo(0, 60, 0), tempo(1, 120, 1000)];

    expect(ticksToSeconds(1, 1, tempos)).toBe(1);
  });

  it('applies the new tempo after a tempo change', () => {
    const tempos = [tempo(0, 60, 0), tempo(1, 120, 1000)];

    expect(ticksToSeconds(2, 1, tempos)).toBe(1.5);
  });

  it('falls back to 120 BPM when tempos is empty', () => {
    expect(ticksToSeconds(2, 1, [])).toBe(1);
  });
});

describe('secondsToTicks', () => {
  it('returns 0 at time 0', () => {
    expect(secondsToTicks(0, 1, [tempo(0, 60, 0)])).toBe(0);
  });

  it('converts seconds linearly within a single tempo segment', () => {
    expect(secondsToTicks(1, 1, [tempo(0, 60, 0)])).toBe(1);
    expect(secondsToTicks(2, 1, [tempo(0, 60, 0)])).toBe(2);
  });

  it('always returns an integer', () => {
    const result = secondsToTicks(0.0003, 1, [tempo(0, 100, 0)]);

    expect(Number.isInteger(result)).toBe(true);
  });

  it('applies the new tempo after a tempo change', () => {
    const tempos = [tempo(0, 60, 0), tempo(1, 120, 1000)];

    expect(secondsToTicks(1.5, 1, tempos)).toBe(2);
  });

  it('falls back to 120 BPM when tempos is empty', () => {
    expect(secondsToTicks(1, 1, [])).toBe(2);
  });

  it('is the inverse of ticksToSeconds', () => {
    const tempos = [tempo(0, 60, 0)];
    const t = ticksToSeconds(42, 1, tempos);

    expect(secondsToTicks(t, 1, tempos)).toBe(42);
  });
});

describe('getCursorX', () => {
  const CHART = {
    resolution: 1,
    tempos: [tempo(0, 60000, 0)],
  } as unknown as ParsedChart;

  describe('rest-only measure', () => {
    const restMeasure = () =>
      measureData(0, 1000, [renderedNote(0, 0, true)], 0, 200);

    it('positions at the stave left edge at measure start', () => {
      expect(getCursorX(0, CHART, restMeasure())).toBe(0);
    });

    it('positions at the stave midpoint at the halfway tick', () => {
      expect(getCursorX(0.5, CHART, restMeasure())).toBe(100);
    });

    it('reaches the stave right edge exactly at measure end', () => {
      expect(getCursorX(1, CHART, restMeasure())).toBe(200);
    });

    it('clamps at the stave left edge when before measure start', () => {
      const data = measureData(
        500,
        1000,
        [renderedNote(500, 0, true)],
        50,
        200,
      );

      expect(getCursorX(0, CHART, data)).toBe(50);
    });

    it('clamps at the stave right edge when past measure end', () => {
      expect(getCursorX(2, CHART, restMeasure())).toBe(200);
    });
  });

  describe('non-rest notes', () => {
    it('snaps to the first note when the tick precedes it', () => {
      const data = measureData(0, 1000, [renderedNote(500, 100)]);

      expect(getCursorX(0, CHART, data)).toBe(100);
    });

    it('returns the note x when the tick equals the note tick', () => {
      const data = measureData(0, 1000, [
        renderedNote(0, 50),
        renderedNote(500, 150),
      ]);

      expect(getCursorX(0, CHART, data)).toBe(50);
    });

    it('interpolates linearly between two adjacent notes', () => {
      const data = measureData(0, 1000, [
        renderedNote(0, 50),
        renderedNote(500, 150),
      ]);

      expect(getCursorX(0.25, CHART, data)).toBe(100);
    });

    it('interpolates from the last note toward the stave right edge within measure bounds', () => {
      const data = measureData(0, 500, [renderedNote(0, 50)], 0, 200);

      expect(getCursorX(0.25, CHART, data)).toBe(125);
    });

    it('clamps at the stave right edge when past measure end', () => {
      const data = measureData(0, 500, [renderedNote(0, 50)], 0, 200);

      expect(getCursorX(1, CHART, data)).toBe(200);
    });

    it('returns the note x when the note sits exactly at the measure end tick', () => {
      const data = measureData(0, 500, [renderedNote(500, 100)], 0, 200);

      expect(getCursorX(1, CHART, data)).toBe(100);
    });

    it('uses note interpolation when the measure contains a mix of rests and real notes', () => {
      const data = measureData(0, 1000, [
        renderedNote(0, 0, true),
        renderedNote(500, 100),
      ]);

      expect(getCursorX(0.25, CHART, data)).toBe(50);
    });
  });
});

describe('getNoteSvg', () => {
  function svgEl(): SVGElement {
    return document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    ) as SVGElement;
  }

  it('returns an SVGElement for each noteHead', () => {
    const el1 = svgEl();
    const el2 = svgEl();
    const note = {
      noteHeads: [{ getSVGElement: () => el1 }, { getSVGElement: () => el2 }],
    } as unknown as StaveNote;

    expect(getNoteSvg(note)).toEqual([el1, el2]);
  });

  it('filters out null noteHeads', () => {
    const el = svgEl();
    const note = {
      noteHeads: [{ getSVGElement: () => null }, { getSVGElement: () => el }],
    } as unknown as StaveNote;

    expect(getNoteSvg(note)).toEqual([el]);
  });

  it('returns an empty array when noteHeads is empty', () => {
    const note = { noteHeads: [] } as unknown as StaveNote;

    expect(getNoteSvg(note)).toEqual([]);
  });
});

describe('calculateAccuracy', () => {
  it('returns 1 for a perfect score with no false hits', () => {
    expect(
      calculateAccuracy({ totalNotes: 10, hitNotes: 10, falseHits: 0 }),
    ).toBe(1);
  });

  it('returns 0 when no notes are hit', () => {
    expect(
      calculateAccuracy({ totalNotes: 10, hitNotes: 0, falseHits: 0 }),
    ).toBe(0);
  });

  it('hitNotes defaults to 0 when omitted', () => {
    expect(calculateAccuracy({ totalNotes: 10, falseHits: 0 })).toBe(0);
  });

  it('returns the correct fraction for partial hits', () => {
    expect(
      calculateAccuracy({ totalNotes: 4, hitNotes: 2, falseHits: 0 }),
    ).toBe(0.5);
  });

  it('false hits reduce accuracy below 1 even when all notes are hit', () => {
    expect(
      calculateAccuracy({ totalNotes: 10, hitNotes: 10, falseHits: 10 }),
    ).toBeCloseTo(0.5);
  });
});

describe('getStarRating', () => {
  const BANDS = [0.2, 0.4, 0.6, 0.8, 0.9];
  const score = (hitNotes: number) => ({
    totalNotes: 100,
    hitNotes,
    falseHits: 0,
  });

  it('STAR_RATING_BANDS has 5 entries', () => {
    expect(STAR_RATING_BANDS).toHaveLength(5);
  });

  it('returns 0 stars when accuracy is below the first band', () => {
    expect(getStarRating(score(0), BANDS)).toBe(0);
    expect(getStarRating(score(19), BANDS)).toBe(0);
  });

  it('awards one additional star per band threshold crossed', () => {
    expect(getStarRating(score(20), BANDS)).toBe(1);
    expect(getStarRating(score(40), BANDS)).toBe(2);
    expect(getStarRating(score(60), BANDS)).toBe(3);
    expect(getStarRating(score(80), BANDS)).toBe(4);
    expect(getStarRating(score(90), BANDS)).toBe(5);
  });

  it('does not award a star just below a band threshold', () => {
    expect(getStarRating(score(39), BANDS)).toBe(1);
    expect(getStarRating(score(59), BANDS)).toBe(2);
    expect(getStarRating(score(79), BANDS)).toBe(3);
    expect(getStarRating(score(89), BANDS)).toBe(4);
  });

  it('returns 5 stars for any accuracy at or above the top band', () => {
    expect(getStarRating(score(100), BANDS)).toBe(5);
  });
});

describe('getCountIn', () => {
  const RES = 480;
  const tempos120 = [tempo(0, 120, 0)];

  function measure(
    startTick: number,
    endTick: number,
    timeSig: [number, number],
  ): Measure {
    return { startTick, endTick, timeSig } as unknown as Measure;
  }

  it('counts the time signature numerator over one measure', () => {
    const m = measure(0, 1920, [4, 4]);
    const { beats, beatMs } = getCountIn(0, [m], {
      resolution: RES,
      tempos: tempos120,
    });

    expect(beats).toBe(4);
    expect(beatMs).toBeCloseTo(500);
  });

  it('counts 3 beats in 3/4', () => {
    const m = measure(0, 1440, [3, 4]);

    expect(getCountIn(0, [m], { resolution: RES, tempos: tempos120 })).toEqual({
      beats: 3,
      beatMs: 500,
    });
  });

  it('counts 6 eighth-note beats in 6/8', () => {
    const m = measure(0, 1440, [6, 8]);

    expect(getCountIn(0, [m], { resolution: RES, tempos: tempos120 })).toEqual({
      beats: 6,
      beatMs: 250,
    });
  });

  it('respects the tempo when deriving beat duration', () => {
    const m = measure(0, 1920, [4, 4]);
    const tempos60 = [tempo(0, 60, 0)];
    const { beats, beatMs } = getCountIn(0, [m], {
      resolution: RES,
      tempos: tempos60,
    });

    expect(beats).toBe(4);
    expect(beatMs).toBeCloseTo(1000);
  });

  it('picks the measure containing the start tick', () => {
    const measures = [measure(0, 1920, [4, 4]), measure(1920, 3360, [3, 4])];

    expect(
      getCountIn(2000, measures, { resolution: RES, tempos: tempos120 }),
    ).toEqual({ beats: 3, beatMs: 500 });
  });

  it('falls back to 4 beats at 120 BPM when there are no measures', () => {
    expect(getCountIn(0, [], { resolution: RES, tempos: tempos120 })).toEqual({
      beats: 4,
      beatMs: 500,
    });
  });
});
