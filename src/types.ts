export interface SongData {
  id: string;
  dir: string;
  albumCover: string | null;
  album: string;
  album_track: string;
  artist: string;
  banner_link_a: string;
  banner_link_b: string;
  charter: string;
  delay: string;
  diff_band: string;
  diff_bass: string;
  diff_bass_real: string;
  diff_bass_real_22: string;
  diff_bassghl: string;
  diff_dance: string;
  diff_drums: string;
  diff_drums_real: string;
  diff_drums_real_ps: string;
  diff_guitar: string;
  diff_guitar_coop: string;
  diff_guitar_real: string;
  diff_guitar_real_22: string;
  diff_guitarghl: string;
  diff_keys: string;
  diff_keys_real: string;
  diff_keys_real_ps: string;
  diff_rhythm: string;
  diff_vocals: string;
  diff_vocals_harm: string;
  drum_fallback_blue: string;
  five_lane_drums: string;
  genre: string;
  icon: string;
  link_name_a: string;
  link_name_b: string;
  loading_phrase: string;
  multiplier_note: string;
  name: string;
  playlist_track: string;
  preview_start_time: string;
  pro_drums: string;
  song_length: string;
  sysex_high_hat_ctrl: string;
  sysex_open_bass: string;
  sysex_rimshot: string;
  sysex_slider: string;
  video: string;
  video_start_time: string;
  year: string;
  liked?: boolean;
  updatedAt?: string;
  format: 'mid' | 'chart';
  audio: AudioData[];
  score?: number;
}

export interface AudioData {
  src: string;
  name: string;
}

export type StemToolsStatus = 'ready' | 'download' | 'unsupported';

export interface IpcDownloadStemToolsResponse {
  progress?: number;
  success?: boolean;
  error?: string;
}

export interface IpcSplitSongResponse {
  id: string;
  progress?: number;
  success?: boolean;
  song?: SongData;
  error?: string;
}

export interface MidiDevice {
  port: number;
  name: string;
}

export enum MidiMessageType {
  NoteOn = 144,
  NoteOff = 128,
}

export interface MidiMessage {
  type: MidiMessageType;
  note: number;
  velocity: number;
}

export interface MidiMapping {
  hihat?: number[];
  ride?: number[];
  crash?: number[];
  kick?: number[];
  snare?: number[];
  tom1?: number[];
  tom2?: number[];
  tom3?: number[];
}

export interface IpcLoadSongResponse {
  data: SongData;
  fileData: Buffer;
}

export interface IpcLoadSongListResponse {
  songs: SongData[];
  lastOpenedPath: string | null;
  downloadedEncoreMd5s: string[];
}

export interface StorageSchema {
  songs: {
    [key: string]: SongData;
  };
}
