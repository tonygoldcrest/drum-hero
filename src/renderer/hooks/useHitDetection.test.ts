import { RefObject } from 'react';
import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaveNote } from 'vexflow';
import {
  ParsedChart,
  RenderData,
  RenderedNote,
} from '../../chart-parser/types';
import { MidiDevice, MidiMapping, MidiMessageType } from '../../types';
import { installIpcMock, IpcMock } from './test-support';
import { useHitDetection } from './useHitDetection';
import { HitHandler } from './useNoteDecoration';

let ipc: IpcMock;
const CHART = {
  resolution: 480,
  tempos: [{ tick: 0, beatsPerMinute: 120, msTime: 0 }],
} as unknown as ParsedChart;
const DEVICE: MidiDevice = { port: 1, name: 'Pad' };

function fakeNote(keys: string[], isRest = false): StaveNote {
  const noteHeads = keys.map(() => {
    const el = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    ) as SVGElement;

    el.style.fill = '#ffffff';

    return { getSVGElement: () => el };
  });

  return {
    isRest: () => isRest,
    getKeys: () => keys,
    noteHeads,
  } as unknown as StaveNote;
}

function rendered(tick: number, note: StaveNote): RenderedNote {
  return { tick, note };
}

function measure(notes: RenderedNote[]): RenderData {
  return { renderedNotes: notes } as unknown as RenderData;
}

interface Props {
  currentTick: number | null;
  device: MidiDevice | null;
  mapping: MidiMapping;
  renderData: RenderData[];
  isPlaying?: boolean;
}

function setup(initial: Props) {
  const onHit = vi.fn<HitHandler>();
  const onHitRef: RefObject<HitHandler | null> = { current: onHit };
  const view = renderHook(
    ({ currentTick, device, mapping, renderData, isPlaying = true }: Props) =>
      useHitDetection(
        currentTick,
        device,
        mapping,
        renderData,
        CHART,
        onHitRef,
        isPlaying,
      ),
    { initialProps: initial },
  );

  return { ...view, onHit };
}

function noteOn(note: number, velocity = 100) {
  act(() =>
    ipc.emit('listen-midi', {
      type: MidiMessageType.NoteOn,
      note,
      velocity,
    }),
  );
}

beforeEach(() => {
  ipc = installIpcMock();
});

describe('useHitDetection', () => {
  it('does not listen without a selected device', () => {
    setup({
      currentTick: 0,
      device: null,
      mapping: { snare: [38] },
      renderData: [],
    });

    expect(ipc.onCount('listen-midi')).toBe(0);
    expect(ipc.sent.some((s) => s.channel === 'listen-midi')).toBe(false);
  });

  it('listens and stops listening around the selected device', () => {
    const { unmount } = setup({
      currentTick: 0,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [],
    });

    expect(ipc.onCount('listen-midi')).toBe(1);

    unmount();

    expect(ipc.onCount('listen-midi')).toBe(0);
  });

  it('does not manage the shared midi stream lifecycle', () => {
    const { unmount } = setup({
      currentTick: 0,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [],
    });

    unmount();

    expect(ipc.sent.some((s) => s.channel === 'listen-midi')).toBe(false);
    expect(ipc.sent.some((s) => s.channel === 'stop-listen-midi')).toBe(false);
  });

  it('registers a hit using the remapped note after a remap', () => {
    const note = fakeNote(['c/5']);
    const { result, rerender } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(480, note)])],
    });

    noteOn(40);
    expect(result.current.hitKeys.current.size).toBe(0);

    act(() =>
      rerender({
        currentTick: 480,
        device: DEVICE,
        mapping: { snare: [40] },
        renderData: [measure([rendered(480, note)])],
      }),
    );

    noteOn(40);
    expect(result.current.hitKeys.current.has('480:c/5')).toBe(true);

    noteOn(38);
    expect(result.current.hitKeys.current.size).toBe(1);
    expect(result.current.incorrectHitCount.current).toBe(0);
  });

  it('registers a correct hit and notifies onHit with the matched note', () => {
    const note = fakeNote(['c/5']);
    const { result, onHit } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(480, note)])],
    });

    noteOn(38);

    expect(result.current.hitKeys.current.has('480:c/5')).toBe(true);
    expect(result.current.incorrectHitCount.current).toBe(0);
    expect(onHit).toHaveBeenCalledWith(note, ['c/5']);
  });

  it('ignores note-on with zero velocity', () => {
    const note = fakeNote(['c/5']);
    const { result } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(480, note)])],
    });

    noteOn(38, 0);

    expect(result.current.hitKeys.current.size).toBe(0);
    expect(result.current.incorrectHitCount.current).toBe(0);
  });

  it('ignores note-off messages', () => {
    const note = fakeNote(['c/5']);
    const { result } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(480, note)])],
    });

    act(() =>
      ipc.emit('listen-midi', {
        type: MidiMessageType.NoteOff,
        note: 38,
        velocity: 100,
      }),
    );

    expect(result.current.hitKeys.current.size).toBe(0);
  });

  it('ignores unmapped midi notes without counting them as misses', () => {
    const note = fakeNote(['c/5']);
    const { result } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(480, note)])],
    });

    noteOn(99);

    expect(result.current.incorrectHitCount.current).toBe(0);
    expect(result.current.hitKeys.current.size).toBe(0);
  });

  it('counts a miss when no note is near the playhead', () => {
    const note = fakeNote(['c/5']);
    const { result } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(5000, note)])],
    });

    noteOn(38);

    expect(result.current.hitKeys.current.size).toBe(0);
    expect(result.current.incorrectHitCount.current).toBe(1);
  });

  it('counts a miss when the nearby note belongs to a different drum', () => {
    const kick = fakeNote(['f/4']);
    const { result } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38], kick: [36] },
      renderData: [measure([rendered(480, kick)])],
    });

    noteOn(38);

    expect(result.current.incorrectHitCount.current).toBe(1);
    expect(result.current.hitKeys.current.size).toBe(0);
  });

  it('counts a repeat hit on the same note as a miss', () => {
    const note = fakeNote(['c/5']);
    const { result } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(480, note)])],
    });

    noteOn(38);
    noteOn(38);

    expect(result.current.hitKeys.current.size).toBe(1);
    expect(result.current.incorrectHitCount.current).toBe(1);
  });

  it('does nothing while the current tick is null', () => {
    const note = fakeNote(['c/5']);
    const { result } = setup({
      currentTick: null,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(480, note)])],
    });

    noteOn(38);

    expect(result.current.hitKeys.current.size).toBe(0);
    expect(result.current.incorrectHitCount.current).toBe(0);
  });

  it('clears hits ahead of the playhead when rewinding', () => {
    const note = fakeNote(['c/5']);
    const { result, rerender } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(480, note)])],
    });

    noteOn(38);
    expect(result.current.hitKeys.current.has('480:c/5')).toBe(true);

    act(() =>
      rerender({
        currentTick: 100,
        device: DEVICE,
        mapping: { snare: [38] },
        renderData: [measure([rendered(480, note)])],
      }),
    );

    expect(result.current.hitKeys.current.has('480:c/5')).toBe(false);
    expect(result.current.incorrectHitCount.current).toBe(0);
  });

  it('clears all hit state when the rendered notes change', () => {
    const note = fakeNote(['c/5']);
    const data = [measure([rendered(480, note)])];
    const { result, rerender } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: data,
    });

    noteOn(38);
    expect(result.current.hitKeys.current.size).toBe(1);

    const next = fakeNote(['c/5']);

    act(() =>
      rerender({
        currentTick: 480,
        device: DEVICE,
        mapping: { snare: [38] },
        renderData: [measure([rendered(480, next)])],
      }),
    );

    expect(result.current.hitKeys.current.size).toBe(0);
  });

  it('picks the closest matching note among several', () => {
    const near = fakeNote(['c/5']);
    const far = fakeNote(['c/5']);
    const { result } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(530, far), rendered(490, near)])],
    });

    noteOn(38);

    expect(result.current.hitKeys.current.has('490:c/5')).toBe(true);
    expect(result.current.hitKeys.current.has('530:c/5')).toBe(false);
  });

  it('skips rest notes when matching', () => {
    const rest = fakeNote(['c/5'], true);
    const { result } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(480, rest)])],
    });

    noteOn(38);

    expect(result.current.hitKeys.current.size).toBe(0);
    expect(result.current.incorrectHitCount.current).toBe(1);
  });

  it('ignores midi hits when not playing', () => {
    const note = fakeNote(['c/5']);
    const { result } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(480, note)])],
      isPlaying: false,
    });

    noteOn(38);

    expect(result.current.hitKeys.current.size).toBe(0);
    expect(result.current.incorrectHitCount.current).toBe(0);
  });

  it('resumes registering hits after isPlaying transitions to true', () => {
    const note = fakeNote(['c/5']);
    const { result, rerender } = setup({
      currentTick: 480,
      device: DEVICE,
      mapping: { snare: [38] },
      renderData: [measure([rendered(480, note)])],
      isPlaying: false,
    });

    noteOn(38);
    expect(result.current.hitKeys.current.size).toBe(0);

    act(() =>
      rerender({
        currentTick: 480,
        device: DEVICE,
        mapping: { snare: [38] },
        renderData: [measure([rendered(480, note)])],
        isPlaying: true,
      }),
    );

    noteOn(38);
    expect(result.current.hitKeys.current.has('480:c/5')).toBe(true);
    expect(result.current.incorrectHitCount.current).toBe(0);
  });
});
