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

export interface Duration {
  duration?: string;
  isTriplet?: boolean;
  dotted?: boolean;
}

export interface RenderData {
  stave: Stave;
  measure: Measure;
}
