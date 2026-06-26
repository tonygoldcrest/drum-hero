import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stave, StaveNote } from 'vexflow';
import { TrackConfig } from './audio-player/types';
import {
  Measure,
  Note,
  ParsedChart,
  RenderData,
  RenderedNote,
} from '../../chart-parser/types';
import { MidiDevice, MidiMessageType } from '../../types';
import { installIpcMock, IpcMock } from '../hooks/test-support';
import { GameEngine, GameContext } from './game-engine';

vi.mock('./metronome', () => ({
  preloadMetronome: vi.fn(),
  playMetronome: vi.fn(),
}));

vi.mock('./audio-player/player', () => {
  class MockAudioPlayer {
    static instances: MockAudioPlayer[] = [];
    onEnded: () => void;
    ready = Promise.resolve([]);
    currentTime = 0;
    duration = 100;
    isInitialised = false;
    start = vi.fn((offset = 0) => {
      this.isInitialised = true;
      this.currentTime = offset;
    });
    pause = vi.fn();
    stop = vi.fn();
    destroy = vi.fn();

    constructor(_trackData: TrackConfig[], onEnded: () => void) {
      this.onEnded = onEnded;
      MockAudioPlayer.instances.push(this);
    }
  }

  return { AudioPlayer: MockAudioPlayer };
});

type MockPlayer = {
  onEnded: () => void;
  currentTime: number;
  start: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const HIT_RGBA = 'rgba(0, 0, 0, 0)';
const MISSED = 'rgb(160, 152, 144)';
const DEVICE: MidiDevice = { port: 1, name: 'Pad' };
const TRACKS: TrackConfig[] = [{ name: 'drums', urls: ['d.ogg'] }];
const CHART = {
  resolution: 480,
  tempos: [{ tick: 0, beatsPerMinute: 120, msTime: 0 }],
} as unknown as ParsedChart;

function svgEl(): SVGElement {
  return document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
  ) as SVGElement;
}

function staveNote(keys: string[], isRest = false): StaveNote {
  const noteHeads = keys.map(() => {
    const el = svgEl();

    el.style.fill = '';

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
  modelNotes: Note[] = [],
): RenderData {
  return {
    stave: fakeStave(),
    measure: { startTick, endTick, notes: modelNotes } as unknown as Measure,
    renderedNotes: notes,
  };
}

function fill(note: StaveNote, head = 0): string {
  return (note.noteHeads[head].getSVGElement() as SVGElement).style.fill;
}

async function getPlayerClass() {
  const mod = await import('./audio-player/player');

  return mod.AudioPlayer as unknown as { instances: MockPlayer[] };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

let ipc: IpcMock;

async function setup(over: Partial<GameContext> = {}) {
  const onEnded = vi.fn();
  const onError = vi.fn();
  const engine = new GameEngine({
    trackData: TRACKS,
    isDev: false,
    onEnded,
    onError,
  });
  const renderData = over.renderData ?? [];

  engine.setSettings({ playheadStyle: 'Cursor', progressColoring: false });
  engine.setContext({
    chart: CHART,
    measures: renderData.map((rd) => rd.measure),
    renderData,
    delaySeconds: 0,
    countInEnabled: false,
    ...over,
  });

  await flush();

  const [player] = (await getPlayerClass()).instances;

  return { engine, onEnded, player };
}

beforeEach(async () => {
  ipc = installIpcMock();
  (await getPlayerClass()).instances.length = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GameEngine', () => {
  it('delegates transport to playback and reflects state', async () => {
    const { engine, player } = await setup({
      renderData: [measureData(0, 1920, [])],
    });

    engine.playFromTick(0);

    expect(player.start).toHaveBeenCalledTimes(1);
    expect(engine.getSnapshot().isPlaying).toBe(true);
  });

  it('forwards the score on ended, counting only non-rest model notes', async () => {
    const { onEnded, player } = await setup({
      renderData: [
        measureData(
          0,
          1920,
          [],
          [
            { isRest: false, notes: ['c/5', 'g/5'] } as Note,
            { isRest: true, notes: ['x'] } as Note,
            { isRest: false, notes: ['f/4'] } as Note,
          ],
        ),
      ],
    });

    player.onEnded();

    expect(onEnded).toHaveBeenCalledWith({
      hitNotes: 0,
      falseHits: 0,
      totalNotes: 3,
    });
  });

  it('positions the cursor element from the current time', async () => {
    const note = staveNote(['c/5'], true);
    const { engine } = await setup({
      renderData: [measureData(0, 1920, [rendered(0, note)])],
    });
    const cursorEl = document.createElement('div');

    engine.setView({ cursorEl, highlightEls: [] });
    engine.timeStore.set(1);

    expect(cursorEl.style.display).toBe('');
    expect(cursorEl.style.transform).toBe(
      'translate3d(50px, 10px, 0) translateX(-50%)',
    );
    expect(cursorEl.style.height).toBe('70px');
  });

  it('hides the cursor when the playhead style is not Cursor', async () => {
    const note = staveNote(['c/5'], true);
    const { engine } = await setup({
      renderData: [measureData(0, 1920, [rendered(0, note)])],
    });

    engine.setSettings({ playheadStyle: 'Measure', progressColoring: false });

    const cursorEl = document.createElement('div');

    engine.setView({ cursorEl, highlightEls: [] });
    engine.timeStore.set(1);

    expect(cursorEl.style.display).toBe('none');
  });

  it('toggles the active measure highlight in Measure mode', async () => {
    const { engine } = await setup({
      renderData: [
        measureData(0, 1920, [rendered(0, staveNote(['c/5'], true))]),
        measureData(1920, 3840, [rendered(1920, staveNote(['c/5'], true))]),
      ],
    });

    engine.setSettings({ playheadStyle: 'Measure', progressColoring: false });

    const a = document.createElement('div');
    const b = document.createElement('div');

    engine.setView({ cursorEl: undefined, highlightEls: [a, b] });
    engine.timeStore.set(2.1);

    expect(b.style.border).toContain('var(--color-accent)');
    expect(b.style.backgroundColor).toBe('var(--color-accent-soft-bg)');
    expect(a.style.backgroundColor).toBe('');
  });

  it('progress-colours notes before the active note', async () => {
    const n0 = staveNote(['c/5']);
    const n1 = staveNote(['d/5']);
    const n2 = staveNote(['e/5']);
    const { engine } = await setup({
      renderData: [
        measureData(0, 1920, [
          rendered(0, n0),
          rendered(240, n1),
          rendered(480, n2),
        ]),
      ],
    });

    engine.setSettings({ playheadStyle: 'Cursor', progressColoring: true });
    engine.setView({
      cursorEl: document.createElement('div'),
      highlightEls: [],
    });
    engine.timeStore.set(0.5);

    expect(fill(n0)).toBe(MISSED);
    expect(fill(n1)).toBe(MISSED);
    expect(fill(n2)).toBe('');
  });

  it('registers a midi hit and hides the struck note head', async () => {
    const note = staveNote(['c/5']);
    const { engine, onEnded, player } = await setup({
      renderData: [
        measureData(
          0,
          1920,
          [rendered(480, note)],
          [{ isRest: false, notes: ['c/5'] } as Note],
        ),
      ],
    });

    engine.setSettings({ playheadStyle: 'Cursor', progressColoring: true });
    engine.setView({
      cursorEl: document.createElement('div'),
      highlightEls: [],
    });
    engine.setMidi(DEVICE, { snare: [38] });
    engine.seekSeconds(0.5);

    ipc.emit('listen-midi', {
      type: MidiMessageType.NoteOn,
      note: 38,
      velocity: 100,
    });

    expect(fill(note)).toBe(HIT_RGBA);

    player.onEnded();
    expect(onEnded).toHaveBeenCalledWith(
      expect.objectContaining({ hitNotes: 1, falseHits: 0 }),
    );
  });

  it('does not register midi hits before playback starts', async () => {
    const note = staveNote(['c/5']);
    const { engine } = await setup({
      renderData: [measureData(0, 1920, [rendered(480, note)])],
    });

    engine.setSettings({ playheadStyle: 'Cursor', progressColoring: true });
    engine.setMidi(DEVICE, { snare: [38] });
    engine.timeStore.set(1);

    ipc.emit('listen-midi', {
      type: MidiMessageType.NoteOn,
      note: 38,
      velocity: 100,
    });

    expect(fill(note)).toBe('');
  });

  it('stops listening to midi when the device is cleared', async () => {
    const { engine } = await setup();

    engine.setMidi(DEVICE, { snare: [38] });
    expect(ipc.onCount('listen-midi')).toBe(1);

    engine.setMidi(null, { snare: [38] });
    expect(ipc.onCount('listen-midi')).toBe(0);
  });

  it('destroys the player on dispose', async () => {
    const { engine, player } = await setup();

    engine.dispose();

    expect(player.destroy).toHaveBeenCalledTimes(1);
  });
});
