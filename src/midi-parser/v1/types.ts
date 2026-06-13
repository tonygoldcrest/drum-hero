import { NoteJSON } from '@tonejs/midi/dist/Note';
import { Stave } from 'vexflow';

export interface Note {
  notes: string[];
  dotted: boolean;
  duration: string;
  isTriplet: boolean;
  isRest: boolean;
  tick: number;
  durationTicks?: number;
}

export interface Beat {
  notes: Note[];
  startTick: number;
  endTick: number;
}

export interface Measure {
  timeSig: [number, number];
  sigChange: boolean;
  hasClef: boolean;
  notes: Note[];
  beats: Beat[];
  startTick: number;
  endTick: number;
  durationTicks?: number;
}

export interface RawMidiNote {
  note: NoteJSON;
  key: string;
}

export interface Modifier {
  forNotes: number[];
  key: string;
}

export interface ModifierNote {
  note: NoteJSON;
  modifier: Modifier;
}

export interface Duration {
  duration?: string;
  isTriplet?: boolean;
  dotted?: boolean;
}

export interface RenderData {
  stave: Stave;
  measure: Measure;
}
