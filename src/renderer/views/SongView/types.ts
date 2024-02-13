export interface VolumeControl {
  trackName: string;
  volume: number;
  previousVolume?: number;
  isMuted: boolean;
  isSoloed: boolean;
}
