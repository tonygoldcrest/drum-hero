import { RenderedNote } from '../../chart-parser/types';

export interface ActiveNoteInfo {
  key: string;
  noteHeadEls: SVGElement[];
  noteIdx: number;
  measureIdx: number;
  renderedNotes: RenderedNote[];
}
