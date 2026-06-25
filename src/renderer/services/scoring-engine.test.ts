import { describe, expect, it, vi } from 'vitest';
import { StaveNote } from 'vexflow';
import {
  ParsedChart,
  RenderData,
  RenderedNote,
} from '../../chart-parser/types';
import { MidiMessage, MidiMessageType } from '../../types';
import {
  ScoringContext,
  ScoringEngine,
  ScoringHitHandler,
} from './scoring-engine';

const CHART = {
  resolution: 480,
  tempos: [{ tick: 0, beatsPerMinute: 120, msTime: 0 }],
} as unknown as ParsedChart;

function fakeNote(keys: string[], isRest = false): StaveNote {
  return {
    isRest: () => isRest,
    getKeys: () => keys,
  } as unknown as StaveNote;
}

function rendered(
  tick: number,
  note: StaveNote,
  marks: { accents?: string[]; ghosts?: string[] } = {},
): RenderedNote {
  return { tick, note, ...marks } as unknown as RenderedNote;
}

function measure(notes: RenderedNote[]): RenderData {
  return { renderedNotes: notes } as unknown as RenderData;
}

function noteOn(note: number, velocity = 100): MidiMessage {
  return { type: MidiMessageType.NoteOn, note, velocity };
}

function setup(
  overrides: Partial<ScoringContext> = {},
  options: { tick?: number; enabled?: boolean } = {},
) {
  const onHit = vi.fn<ScoringHitHandler>();
  const engine = new ScoringEngine();

  engine.setContext({
    chart: CHART,
    renderData: [],
    midiMapping: { snare: [38] },
    ...overrides,
  });
  engine.setEnabled(options.enabled ?? true);
  engine.setTick(options.tick ?? 0);
  engine.onHit(onHit);

  return { engine, onHit };
}

describe('ScoringEngine', () => {
  it('registers a correct hit and notifies onHit with the matched note', () => {
    const note = fakeNote(['c/5']);
    const { engine, onHit } = setup(
      { renderData: [measure([rendered(480, note)])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38));

    expect(engine.isHit(480, 'c/5')).toBe(true);
    expect(engine.falseHitCount).toBe(0);
    expect(onHit).toHaveBeenCalledWith(note, ['c/5']);
  });

  it('registers a hit using the remapped note after a remap', () => {
    const note = fakeNote(['c/5']);
    const renderData = [measure([rendered(480, note)])];
    const { engine } = setup(
      { renderData, midiMapping: { snare: [38] } },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(40));
    expect(engine.hitCount).toBe(0);

    engine.setContext({
      chart: CHART,
      renderData,
      midiMapping: { snare: [40] },
    });
    engine.handleMidiMessage(noteOn(40));
    expect(engine.isHit(480, 'c/5')).toBe(true);

    engine.handleMidiMessage(noteOn(38));
    expect(engine.hitCount).toBe(1);
    expect(engine.falseHitCount).toBe(0);
  });

  it('ignores note-on with zero velocity', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(480, note)])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38, 0));

    expect(engine.hitCount).toBe(0);
    expect(engine.falseHitCount).toBe(0);
  });

  it('ignores note-off messages', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(480, note)])] },
      { tick: 480 },
    );

    engine.handleMidiMessage({
      type: MidiMessageType.NoteOff,
      note: 38,
      velocity: 100,
    });

    expect(engine.hitCount).toBe(0);
  });

  it('ignores unmapped midi notes without counting them as misses', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(480, note)])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(99));

    expect(engine.falseHitCount).toBe(0);
    expect(engine.hitCount).toBe(0);
  });

  it('counts a miss when no note is near the playhead', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(5000, note)])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38));

    expect(engine.hitCount).toBe(0);
    expect(engine.falseHitCount).toBe(1);
  });

  it('counts a miss when the nearby note belongs to a different drum', () => {
    const kick = fakeNote(['f/4']);
    const { engine } = setup(
      {
        renderData: [measure([rendered(480, kick)])],
        midiMapping: { snare: [38], kick: [36] },
      },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38));

    expect(engine.falseHitCount).toBe(1);
    expect(engine.hitCount).toBe(0);
  });

  it('counts a repeat hit on the same note as a miss', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(480, note)])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38));
    engine.handleMidiMessage(noteOn(38));

    expect(engine.hitCount).toBe(1);
    expect(engine.falseHitCount).toBe(1);
  });

  it('does nothing while the current tick is undefined', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup({ renderData: [measure([rendered(480, note)])] });

    engine.setTick(undefined);
    engine.handleMidiMessage(noteOn(38));

    expect(engine.hitCount).toBe(0);
    expect(engine.falseHitCount).toBe(0);
  });

  it('clears hits ahead of the playhead when rewinding', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(480, note)])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38));
    expect(engine.isHit(480, 'c/5')).toBe(true);

    engine.setTick(100);

    expect(engine.isHit(480, 'c/5')).toBe(false);
    expect(engine.falseHitCount).toBe(0);
  });

  it('clears all hit state when the rendered notes change', () => {
    const note = fakeNote(['c/5']);
    const renderData = [measure([rendered(480, note)])];
    const { engine } = setup({ renderData }, { tick: 480 });

    engine.handleMidiMessage(noteOn(38));
    expect(engine.hitCount).toBe(1);

    const next = fakeNote(['c/5']);

    engine.setContext({
      chart: CHART,
      renderData: [measure([rendered(480, next)])],
      midiMapping: { snare: [38] },
    });

    expect(engine.hitCount).toBe(0);
  });

  it('picks the closest matching note among several', () => {
    const near = fakeNote(['c/5']);
    const far = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(530, far), rendered(490, near)])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38));

    expect(engine.isHit(490, 'c/5')).toBe(true);
    expect(engine.isHit(530, 'c/5')).toBe(false);
  });

  it('skips rest notes when matching', () => {
    const rest = fakeNote(['c/5'], true);
    const { engine } = setup(
      { renderData: [measure([rendered(480, rest)])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38));

    expect(engine.hitCount).toBe(0);
    expect(engine.falseHitCount).toBe(1);
  });

  it('ignores midi hits when not enabled', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(480, note)])] },
      { tick: 480, enabled: false },
    );

    engine.handleMidiMessage(noteOn(38));

    expect(engine.hitCount).toBe(0);
    expect(engine.falseHitCount).toBe(0);
  });

  it('resumes registering hits after enabled transitions to true', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(480, note)])] },
      { tick: 480, enabled: false },
    );

    engine.handleMidiMessage(noteOn(38));
    expect(engine.hitCount).toBe(0);

    engine.setEnabled(true);
    engine.handleMidiMessage(noteOn(38));

    expect(engine.isHit(480, 'c/5')).toBe(true);
    expect(engine.falseHitCount).toBe(0);
  });

  it('rejects a soft hit on an accented note as a miss', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(480, note, { accents: ['c/5'] })])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38, 80));

    expect(engine.hitCount).toBe(0);
    expect(engine.falseHitCount).toBe(1);
  });

  it('accepts a hard hit on an accented note', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(480, note, { accents: ['c/5'] })])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38, 110));

    expect(engine.isHit(480, 'c/5')).toBe(true);
    expect(engine.falseHitCount).toBe(0);
  });

  it('rejects a loud hit on a ghost note as a miss', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(480, note, { ghosts: ['c/5'] })])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38, 80));

    expect(engine.hitCount).toBe(0);
    expect(engine.falseHitCount).toBe(1);
  });

  it('accepts a soft hit on a ghost note', () => {
    const note = fakeNote(['c/5']);
    const { engine } = setup(
      { renderData: [measure([rendered(480, note, { ghosts: ['c/5'] })])] },
      { tick: 480 },
    );

    engine.handleMidiMessage(noteOn(38, 30));

    expect(engine.isHit(480, 'c/5')).toBe(true);
    expect(engine.falseHitCount).toBe(0);
  });

  it('stops notifying a removed hit listener', () => {
    const note = fakeNote(['c/5']);
    const onHit = vi.fn<ScoringHitHandler>();
    const engine = new ScoringEngine();

    engine.setContext({
      chart: CHART,
      renderData: [measure([rendered(480, note)])],
      midiMapping: { snare: [38] },
    });
    engine.setEnabled(true);
    engine.setTick(480);

    const unsubscribe = engine.onHit(onHit);

    unsubscribe();
    engine.handleMidiMessage(noteOn(38));

    expect(onHit).not.toHaveBeenCalled();
    expect(engine.isHit(480, 'c/5')).toBe(true);
  });
});
