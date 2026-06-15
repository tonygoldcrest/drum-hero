export interface VolumeControl {
  trackName: string;
  volume: number;
  previousVolume?: number;
  isMuted: boolean;
  isSoloed: boolean;
}

export const PLAYHEAD_STYLES = ['Cursor', 'Measure', 'None'] as const;
export type PlayheadStyle = (typeof PLAYHEAD_STYLES)[number];
