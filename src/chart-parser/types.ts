import { Stave, StaveNote } from 'vexflow';
import { parseChartFile } from 'scan-chart';

export interface Note {
  notes: string[];
  duration: string;
  dots: number;
  isRest: boolean;
  tick: number;
  tupletId?: number;
  // Ornamental hits (flams/drags) drawn before this note, out of time. Each
  // entry is a chord of keys.
  graceNotes?: string[][];
}

export interface Measure {
  timeSig: [number, number];
  sigChange: boolean;
  hasClef: boolean;
  isCompound: boolean;
  startTick: number;
  endTick: number;
  notes: Note[];
  tuplets: TupletMeta[];
}

export interface TupletMeta {
  id: number;
  numNotes: number;
  notesOccupied: number;
}

export interface RenderData {
  stave: Stave;
  measure: Measure;
  renderedNotes: RenderedNote[];
}

export type ParsedChart = ReturnType<typeof parseChartFile>;

export interface RenderedNote {
  tick: number;
  note: StaveNote;
}
