import { StaveNote } from 'vexflow';
import { ParsedChart, RenderData } from '../../chart-parser/types';
import { PlayheadStyle } from '../types';
import { keyPrefix } from './scoring-engine';
import {
  HIT_NOTE_COLOR,
  MISSED_NOTE_COLOR,
  getCursorX,
  getNoteSvg,
} from '../views/utils';

export type IsHit = (tick: number, prefix: string) => boolean;

export interface ViewContext {
  chart: ParsedChart | undefined;
  renderData: RenderData[];
}

export interface ViewRefs {
  cursorEl: HTMLElement | undefined;
  highlightEls: (HTMLElement | undefined)[];
}

interface NotePos {
  measureIdx: number;
  noteIdx: number;
}

interface ActiveNote extends NotePos {
  noteHeadEls: SVGElement[];
}

function samePos(a: NotePos | undefined, b: NotePos | undefined): boolean {
  if (!a || !b) {
    return a === b;
  }

  return a.measureIdx === b.measureIdx && a.noteIdx === b.noteIdx;
}

function setScaleTransform(el: SVGElement, transform: string): void {
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

export class ViewEngine {
  private chart: ParsedChart | undefined;
  private renderData: RenderData[] = [];
  private playheadStyle: PlayheadStyle = 'Cursor';
  private progressColoring = false;
  private cursorEl: HTMLElement | undefined;
  private cursorShown = false;
  private cursorHeight = -1;
  private highlightEls: (HTMLElement | undefined)[] = [];
  private scrollContainer: HTMLElement | undefined;
  private measureIdx = -1;
  private activePos: NotePos | undefined;
  private coloredPos: NotePos | undefined;
  private scaledEls: SVGElement[] = [];
  private filledEls = new Set<SVGElement>();

  constructor(private isHit: IsHit) {}

  setContext(context: ViewContext): void {
    const renderDataChanged = this.renderData !== context.renderData;

    this.chart = context.chart;
    this.renderData = context.renderData;

    if (renderDataChanged) {
      this.reset();
    }
  }

  setSettings(playheadStyle: PlayheadStyle, progressColoring: boolean): void {
    this.playheadStyle = playheadStyle;
    this.progressColoring = progressColoring;
    this.activePos = undefined;
    this.coloredPos = undefined;

    if (this.measureIdx >= 0) {
      this.updateHighlight(this.measureIdx);
    }
  }

  setRefs(refs: ViewRefs): void {
    this.cursorEl = refs.cursorEl;
    this.highlightEls = refs.highlightEls;
    this.scrollContainer = undefined;
    this.reset();
  }

  render(chartTime: number, tick: number): void {
    this.syncMeasure(tick);
    this.syncActiveNote(tick);
    this.updateCursor(chartTime);
  }

  paintHit(note: StaveNote, prefixes: string[]): void {
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

  reset(): void {
    this.measureIdx = -1;
    this.activePos = undefined;
    this.coloredPos = undefined;
    this.scrollContainer = undefined;
    this.cursorShown = false;
    this.cursorHeight = -1;
    this.scaledEls = [];
    this.filledEls.clear();
  }

  private syncMeasure(tick: number): void {
    const idx = this.seekMeasure(tick);

    if (idx < 0 || idx === this.measureIdx) {
      return;
    }

    this.measureIdx = idx;
    this.updateHighlight(idx);
    this.updateScroll(idx);
  }

  private seekMeasure(tick: number): number {
    const rd = this.renderData;

    if (rd.length === 0) {
      return -1;
    }

    let idx =
      this.measureIdx < 0 ? 0 : Math.min(this.measureIdx, rd.length - 1);

    while (idx + 1 < rd.length && tick >= rd[idx + 1].measure.startTick) {
      idx++;
    }

    while (idx > 0 && tick < rd[idx].measure.startTick) {
      idx--;
    }

    const { measure } = rd[idx];

    return tick >= measure.startTick && tick < measure.endTick ? idx : -1;
  }

  private syncActiveNote(tick: number): void {
    const pos = this.locateActiveNote(tick);

    if (samePos(pos, this.activePos)) {
      return;
    }

    this.activePos = pos;

    const target = pos ? this.toActiveNote(pos) : undefined;

    this.applyScale(target);
    this.applyColoring(target);
  }

  private locateActiveNote(tick: number): NotePos | undefined {
    const mIdx = this.measureIdx;

    if (this.playheadStyle === 'None' || mIdx < 0) {
      return undefined;
    }

    const notes = this.renderData[mIdx]?.renderedNotes;

    if (!notes) {
      return undefined;
    }

    let nIdx =
      this.activePos?.measureIdx === mIdx ? this.activePos.noteIdx : -1;

    while (nIdx + 1 < notes.length && notes[nIdx + 1].tick <= tick) {
      nIdx++;
    }

    while (nIdx >= 0 && notes[nIdx].tick > tick) {
      nIdx--;
    }

    return nIdx < 0 ? undefined : { measureIdx: mIdx, noteIdx: nIdx };
  }

  private toActiveNote(pos: NotePos): ActiveNote | undefined {
    const note =
      this.renderData[pos.measureIdx].renderedNotes[pos.noteIdx].note;
    const noteHeadEls = getNoteSvg(note);

    return noteHeadEls.length === 0 ? undefined : { ...pos, noteHeadEls };
  }

  private applyScale(target: ActiveNote | undefined): void {
    this.scaledEls.forEach((el) => setScaleTransform(el, ''));
    this.scaledEls = target?.noteHeadEls ?? [];
    target?.noteHeadEls.forEach((el) => setScaleTransform(el, 'scale(1.5)'));
  }

  private applyColoring(target: ActiveNote | undefined): void {
    const colorNote = (el: SVGElement, tick: number, key: string) => {
      (el as SVGGraphicsElement).style.fill = this.isHit(tick, key)
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

    if (!target || this.playheadStyle === 'None' || !this.progressColoring) {
      clearAll();
      this.coloredPos = undefined;

      return;
    }

    const { measureIdx, noteIdx } = target;
    const curNotes = this.renderData[measureIdx].renderedNotes;
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
        const { note, tick } = curNotes[i];

        forEachNoteHead(note, (el, key) => colorNote(el, tick, key));
      }
    } else {
      const fromMeasure = prev?.measureIdx ?? 0;
      const fromNote = prev?.noteIdx ?? 0;

      if (fromMeasure === measureIdx) {
        for (let i = fromNote; i < noteIdx; i++) {
          const { note, tick } = curNotes[i];

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
          const { note, tick } = curNotes[i];

          forEachNoteHead(note, (el, key) => colorNote(el, tick, key));
        }
      }
    }

    this.coloredPos = { measureIdx, noteIdx };
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

  private updateCursor(chartTime: number): void {
    const el = this.cursorEl;

    if (!el) {
      return;
    }

    const measureData = this.renderData[this.measureIdx];

    if (this.playheadStyle !== 'Cursor' || !this.chart || !measureData) {
      el.style.display = 'none';
      this.cursorShown = false;

      return;
    }

    const x = getCursorX(chartTime, this.chart, measureData);
    const y = measureData.stave.getY();
    const height = measureData.stave.getHeight() + 30;

    el.style.transform = `translate3d(${x}px, ${y}px, 0) translateX(-50%)`;

    if (height !== this.cursorHeight) {
      el.style.height = `${height}px`;
      this.cursorHeight = height;
    }

    if (!this.cursorShown) {
      el.style.display = '';
      this.cursorShown = true;
    }
  }

  private updateScroll(index: number): void {
    if (this.playheadStyle === 'None') {
      return;
    }

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
}
