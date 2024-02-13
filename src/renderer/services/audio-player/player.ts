import { AudioTrack } from './track';
import { TrackConfig } from './types';

export class AudioPlayer {
  context: AudioContext;

  audioTracks: AudioTrack[] = [];

  ready: Promise<AudioTrack[]>;

  isInitialised: boolean = false;

  onEnded: (() => void) | null;

  private startedAt: number = -1;

  private offset: number = 0;

  duration: number = 0;

  constructor(trackConfigs: TrackConfig[], onEnded: () => void) {
    this.context = new AudioContext();

    this.ready = this.createTracks(trackConfigs);

    this.onEnded = onEnded;

    this.ready
      .then((tracks) => {
        this.duration = Math.max(...tracks.map((track) => track.duration));
        return this.duration;
      })
      .catch(() => {});
  }

  async createTracks(trackConfigs: TrackConfig[]) {
    return Promise.all(
      trackConfigs.map(async ({ name, urls }) => {
        const dataBuffers = await Promise.all(
          urls.map((url) => fetch(url).then((res) => res.arrayBuffer())),
        );

        const audioBuffers = await Promise.all(
          dataBuffers.map((buf) => this.context.decodeAudioData(buf)),
        );

        const audioTrack = new AudioTrack(audioBuffers, name, this.context);

        audioTrack.endedListener = this.trackEndedListener;

        this.audioTracks.push(audioTrack);

        return audioTrack;
      }),
    );
  }

  start(offset: number = 0) {
    if (this.isInitialised) {
      this.stop();
    }
    this.offset = offset;

    const time = this.context.currentTime;
    this.startedAt = time;
    this.audioTracks.forEach((track) => track.start(time, offset));
    this.isInitialised = true;
  }

  stop() {
    this.audioTracks.forEach((track) => track.stop());
    this.isInitialised = false;
    this.startedAt = -1;
  }

  pause() {
    this.context.suspend();
  }

  resume() {
    this.context.resume();
  }

  get currentTime() {
    if (this.startedAt < 0) {
      return 0;
    }

    return this.context.currentTime - this.startedAt + this.offset;
  }

  destroy() {
    this.audioTracks.forEach((track) => track.destroy());
    this.audioTracks = [];

    this.onEnded = null;

    this.context.close();
  }

  trackEndedListener = () => {
    if (this.audioTracks.filter((track) => !track.ended).length !== 0) {
      return;
    }

    this.stop();
    this.onEnded?.();
  };
}
