import { StaveNote } from 'vexflow';
import { TrackConfig } from './audio-player/types';
import { TimeStore } from './time-store';
import { Measure, ParsedChart, RenderData } from '../../chart-parser/types';
import { MidiDevice, MidiMapping, MidiMessage, ScoreData } from '../../types';
import { PlayheadStyle } from '../types';
import { PlaybackEngine, PlaybackSnapshot } from './playback-engine';
import { ScoringEngine, keyPrefix } from './scoring-engine';
import {
  HIT_NOTE_COLOR,
  MISSED_NOTE_COLOR,
  getCursorX,
  getNoteSvg,
  secondsToTicks,
} from '../views/utils';

export interface GameEngineOptions {
  trackData: TrackConfig[];
  isDev: boolean;
  onEnded: (score: ScoreData) => void;
  onError: () => void;
}

export interface GameContext {
  chart: ParsedChart | undefined;
  measures: Measure[];
  renderData: RenderData[];
  delaySeconds: number;
  countInEnabled: boolean;
}

export interface GameSettings {
  playheadStyle: PlayheadStyle;
  progressColoring: boolean;
}

export interface GameView {
  cursorEl: HTMLElement | undefined;
  highlightEls: (HTMLElement | undefined)[];
}

interface ActiveNote {
  key: string;
  noteHeadEls: SVGElement[];
  noteIdx: number;
  measureIdx: number;
  renderedNotes: RenderData['renderedNotes'];
}

function applyScale(el: SVGElement, transform: string): void {
  const g = el as SVGGraphicsElement;

  g.style.transformBox = 'fill-box';
  g.style.transformOrigin = 'center';
  g.style.transition = 'transform 0.08s ease-out';
  g.style.transform = transform;
}

function forEachNoteHead(
  note: StaveNote,
  cb: (el: SVGElement, prefix: string) => void,
): void {
  note.getKeys().forEach((key, i) => {
    const el = note.noteHeads[i]?.getSVGElement();

    if (el) {
      cb(el, keyPrefix(key));
    }
  });
}

function getScrollParent(
  node: HTMLElement | undefined,
): HTMLElement | undefined {
  let el = node?.parentElement ?? undefined;

  while (el) {
    const { overflowY } = getComputedStyle(el);

    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight
    ) {
      return el;
    }

    el = el.parentElement ?? undefined;
  }

  return undefined;
}

export class GameEngine {
  private playback: PlaybackEngine;
  private scoring = new ScoringEngine();
  private onEndedCb: (score: ScoreData) => void;
  private chart: ParsedChart | undefined;
  private renderData: RenderData[] = [];
  private delaySeconds = 0;
  private midiMapping: MidiMapping = {};
  private device: MidiDevice | null = null;
  private playheadStyle: PlayheadStyle = 'Cursor';
  private progressColoring = false;
  private cursorEl: HTMLElement | undefined;
  private highlightEls: (HTMLElement | undefined)[] = [];
  private scrollContainer: HTMLElement | undefined;
  private midiUnsub: (() => void) | undefined;
  private highlightedIndex = -1;
  private lastMeasureIndex = -1;
  private scrolledIndex = -1;
  private scaledEls: SVGElement[] = [];
  private scaledKey: string | undefined;
  private filledEls = new Set<SVGElement>();
  private coloredKey: string | undefined;
  private coloredPos: { measureIdx: number; noteIdx: number } | undefined;
  private timeUnsub: () => void;
  private playbackUnsub: () => void;

  constructor(options: GameEngineOptions) {
    this.onEndedCb = options.onEnded;
    this.playback = new PlaybackEngine({
      trackData: options.trackData,
      isDev: options.isDev,
      onEnded: () => this.handleEnded(),
      onError: options.onError,
    });
    this.timeUnsub = this.playback.timeStore.subscribe(this.handleFrame);
    this.playbackUnsub = this.playback.subscribe(this.handlePlaybackChange);
    this.scoring.onHit((note, prefixes) => this.paintHit(note, prefixes));
  }

  get timeStore(): TimeStore {
    return this.playback.timeStore;
  }

  subscribe = (listener: () => void): (() => void) =>
    this.playback.subscribe(listener);

  getSnapshot = (): PlaybackSnapshot => this.playback.getSnapshot();

  setContext(context: GameContext): void {
    const renderDataChanged = this.renderData !== context.renderData;

    this.chart = context.chart;
    this.renderData = context.renderData;
    this.delaySeconds = context.delaySeconds;
    this.playback.setContext({
      chart: context.chart,
      measures: context.measures,
      delaySeconds: context.delaySeconds,
      countInEnabled: context.countInEnabled,
    });
    this.scoring.setContext({
      chart: context.chart,
      renderData: context.renderData,
      midiMapping: this.midiMapping,
    });

    if (renderDataChanged) {
      this.resetRenderState();
    }

    this.renderFrame();
  }

  setSettings(settings: GameSettings): void {
    this.playheadStyle = settings.playheadStyle;
    this.progressColoring = settings.progressColoring;
    this.renderFrame();
  }

  setMidi(device: MidiDevice | null, mapping: MidiMapping): void {
    this.midiMapping = mapping;
    this.scoring.setContext({
      chart: this.chart,
      renderData: this.renderData,
      midiMapping: mapping,
    });

    if (device !== this.device) {
      this.device = device;
      this.connectMidi();
    }
  }

  setView(view: GameView): void {
    this.cursorEl = view.cursorEl;
    this.highlightEls = view.highlightEls;
    this.scrollContainer = undefined;
    this.resetRenderState();
    this.renderFrame();
  }

  setDev(isDev: boolean): void {
    this.playback.setDev(isDev);
  }

  play(): void {
    this.playback.play();
  }

  playFromTick(tick: number): void {
    this.playback.playFromTick(tick);
  }

  pause(): void {
    this.playback.pause();
  }

  cancel(): void {
    this.playback.cancel();
  }

  seekSeconds(seconds: number): void {
    this.playback.seekSeconds(seconds);
  }

  setStemVolume(name: string, gain: number): void {
    this.playback.setStemVolume(name, gain);
  }

  renderFrame(): void {
    if (!this.chart) {
      return;
    }

    const chartTime = this.playback.timeStore.get() - this.delaySeconds;
    const tick = secondsToTicks(
      chartTime,
      this.chart.resolution,
      this.chart.tempos,
    );

    this.scoring.setTick(tick);
    this.updateView(chartTime, tick);
  }

  dispose(): void {
    this.timeUnsub();
    this.playbackUnsub();
    this.midiUnsub?.();
    this.playback.dispose();
  }

  private handleFrame = (): void => {
    this.renderFrame();
  };

  private handlePlaybackChange = (): void => {
    this.scoring.setEnabled(this.playback.getSnapshot().isPlaying);
  };

  private handleEnded(): void {
    this.onEndedCb({
      hitNotes: this.scoring.hitCount,
      falseHits: this.scoring.falseHitCount,
      totalNotes: this.totalNotes(),
    });
  }

  private totalNotes(): number {
    return this.renderData
      .flatMap((rd) => rd.measure.notes)
      .filter((note) => !note.isRest)
      .reduce((sum, note) => sum + note.notes.length, 0);
  }

  private connectMidi(): void {
    this.midiUnsub?.();
    this.midiUnsub = undefined;

    if (!this.device) {
      return;
    }

    this.midiUnsub = window.electron.ipcRenderer.on<MidiMessage>(
      'listen-midi',
      (message) => this.scoring.handleMidiMessage(message),
    );
  }

  private updateView(chartTime: number, tick: number): void {
    const found = this.findMeasureIndex(tick);

    if (found >= 0) {
      this.highlightedIndex = found;
    }

    const index = this.highlightedIndex;

    if (index !== this.lastMeasureIndex) {
      this.lastMeasureIndex = index;
      this.updateHighlight(index);
      this.updateScroll(index);
    }

    this.updateCursor(chartTime, index);
    this.updateDecoration(index, tick);
  }

  private updateHighlight(index: number): void {
    this.highlightEls.forEach((el, i) => {
      if (!el) {
        return;
      }

      const on = this.playheadStyle === 'Measure' && i === index;

      el.style.backgroundColor = on ? 'var(--color-accent-soft-bg)' : '';
      el.style.border = on ? '2px solid var(--color-accent)' : '';
    });
  }

  private updateCursor(chartTime: number, index: number): void {
    const el = this.cursorEl;

    if (!el) {
      return;
    }

    const measureData = this.renderData[index];

    if (this.playheadStyle !== 'Cursor' || !this.chart || !measureData) {
      el.style.display = 'none';

      return;
    }

    const x = getCursorX(chartTime, this.chart, measureData);

    el.style.display = '';
    el.style.left = `${x}px`;
    el.style.top = `${measureData.stave.getY()}px`;
    el.style.height = `${measureData.stave.getHeight() + 30}px`;
  }

  private updateScroll(index: number): void {
    if (
      this.playheadStyle === 'None' ||
      index < 0 ||
      index === this.scrolledIndex
    ) {
      return;
    }

    this.scrolledIndex = index;

    const el = this.highlightEls[index];

    if (!el) {
      return;
    }

    const container =
      this.scrollContainer ?? (this.scrollContainer = getScrollParent(el));

    if (!container) {
      return;
    }

    const elRect = el.getBoundingClientRect();
    const parentRect = container.getBoundingClientRect();
    const margin = parentRect.height * 0.25;
    const outOfView =
      elRect.top < parentRect.top + margin ||
      elRect.bottom > parentRect.bottom - margin;

    if (outOfView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private updateDecoration(measureIndex: number, tick: number): void {
    const active = this.computeActiveNote(measureIndex, tick);

    this.updateScale(active);
    this.updateColoring(active);
  }

  private computeActiveNote(
    measureIndex: number,
    tick: number,
  ): ActiveNote | undefined {
    if (this.playheadStyle === 'None' || measureIndex < 0) {
      return undefined;
    }

    const measureData = this.renderData[measureIndex];

    if (!measureData) {
      return undefined;
    }

    const { renderedNotes } = measureData;
    let noteIdx = -1;

    for (let i = 0; i < renderedNotes.length; i++) {
      if (renderedNotes[i].tick <= tick) {
        noteIdx = i;
      } else {
        break;
      }
    }

    if (noteIdx < 0) {
      return undefined;
    }

    const noteHeadEls = getNoteSvg(renderedNotes[noteIdx].note);

    if (noteHeadEls.length === 0) {
      return undefined;
    }

    return {
      key: `${measureIndex}-${noteIdx}`,
      noteHeadEls,
      noteIdx,
      measureIdx: measureIndex,
      renderedNotes,
    };
  }

  private updateScale(active: ActiveNote | undefined): void {
    if (!active) {
      if (this.scaledEls.length > 0) {
        this.scaledEls.forEach((el) => applyScale(el, ''));
        this.scaledEls = [];
        this.scaledKey = undefined;
      }

      return;
    }

    if (this.scaledKey === active.key) {
      return;
    }

    this.scaledEls.forEach((el) => applyScale(el, ''));
    active.noteHeadEls.forEach((el) => applyScale(el, 'scale(1.5)'));
    this.scaledEls = active.noteHeadEls;
    this.scaledKey = active.key;
  }

  private updateColoring(active: ActiveNote | undefined): void {
    if (active?.key === this.coloredKey) {
      return;
    }

    const colorNote = (el: SVGElement, tick: number, key: string) => {
      (el as SVGGraphicsElement).style.fill = this.scoring.isHit(tick, key)
        ? HIT_NOTE_COLOR
        : MISSED_NOTE_COLOR;
      this.filledEls.add(el);
    };
    const clearAll = () => {
      this.filledEls.forEach((el) => {
        (el as SVGGraphicsElement).style.fill = '';
      });
      this.filledEls.clear();
    };

    if (!active || this.playheadStyle === 'None' || !this.progressColoring) {
      clearAll();
      this.coloredKey = undefined;
      this.coloredPos = undefined;

      return;
    }

    const { noteIdx, measureIdx, renderedNotes: curRenderedNotes } = active;
    const prev = this.coloredPos;
    const isBackward =
      prev !== undefined &&
      (measureIdx < prev.measureIdx ||
        (measureIdx === prev.measureIdx && noteIdx < prev.noteIdx));

    if (isBackward) {
      clearAll();

      for (let m = 0; m < measureIdx; m++) {
        this.renderData[m]?.renderedNotes.forEach(({ note, tick }) =>
          forEachNoteHead(note, (el, key) => colorNote(el, tick, key)),
        );
      }

      for (let i = 0; i < noteIdx; i++) {
        const { note, tick } = curRenderedNotes[i];

        forEachNoteHead(note, (el, key) => colorNote(el, tick, key));
      }
    } else {
      const fromMeasure = prev?.measureIdx ?? 0;
      const fromNote = prev?.noteIdx ?? 0;

      if (fromMeasure === measureIdx) {
        for (let i = fromNote; i < noteIdx; i++) {
          const { note, tick } = curRenderedNotes[i];

          forEachNoteHead(note, (el, key) => colorNote(el, tick, key));
        }
      } else {
        const prevMeasureNotes =
          this.renderData[fromMeasure]?.renderedNotes ?? [];

        for (let i = fromNote; i < prevMeasureNotes.length; i++) {
          const { note, tick } = prevMeasureNotes[i];

          forEachNoteHead(note, (el, key) => colorNote(el, tick, key));
        }

        for (let m = fromMeasure + 1; m < measureIdx; m++) {
          this.renderData[m]?.renderedNotes.forEach(({ note, tick }) =>
            forEachNoteHead(note, (el, key) => colorNote(el, tick, key)),
          );
        }

        for (let i = 0; i < noteIdx; i++) {
          const { note, tick } = curRenderedNotes[i];

          forEachNoteHead(note, (el, key) => colorNote(el, tick, key));
        }
      }
    }

    this.coloredKey = active.key;
    this.coloredPos = { measureIdx, noteIdx };
  }

  private paintHit(note: StaveNote, prefixes: string[]): void {
    if (!this.progressColoring || this.playheadStyle === 'None') {
      return;
    }

    note.getKeys().forEach((key, i) => {
      if (!prefixes.includes(keyPrefix(key))) {
        return;
      }

      const el = note.noteHeads[i]?.getSVGElement();

      if (el) {
        (el as SVGGraphicsElement).style.fill = HIT_NOTE_COLOR;
        this.filledEls.add(el);
      }
    });
  }

  private findMeasureIndex(tick: number): number {
    let lo = 0;
    let hi = this.renderData.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const { measure } = this.renderData[mid];

      if (tick < measure.startTick) {
        hi = mid - 1;
      } else if (tick >= measure.endTick) {
        lo = mid + 1;
      } else {
        return mid;
      }
    }

    return -1;
  }

  private resetRenderState(): void {
    this.filledEls.clear();
    this.coloredKey = undefined;
    this.coloredPos = undefined;
    this.scaledEls = [];
    this.scaledKey = undefined;
    this.highlightedIndex = -1;
    this.lastMeasureIndex = -1;
    this.scrolledIndex = -1;
    this.scrollContainer = undefined;
  }
}
