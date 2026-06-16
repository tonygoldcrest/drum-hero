export interface AudioFile {
  name: string;
  src: string;
  elements: HTMLAudioElement[];
  volume: number;
}

export const PLAYHEAD_STYLES = ['Cursor', 'Measure', 'None'] as const;
export type PlayheadStyle = (typeof PLAYHEAD_STYLES)[number];
