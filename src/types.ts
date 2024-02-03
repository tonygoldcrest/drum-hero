export interface SongData {
  id: string;
  dir: string;
  albumCover: string;
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
}

export interface AudioData {
  src: string;
  name: string;
}

export interface IpcLoadSongResponse {
  data: SongData;
  midi: Buffer;
  audio: AudioData[];
}

export type IpcLoadSongListResponse = SongData[];

export interface StorageSchema {
  songs: {
    [key: string]: SongData;
  };
}
