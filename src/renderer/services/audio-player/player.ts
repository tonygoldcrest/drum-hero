import { AudioTrack } from './track';
import { TrackConfig } from './types';

export class AudioPlayer {
  context: AudioContext;

  audioTracks: AudioTrack[] = [];

  ready: Promise<AudioTrack[]>;

  isInitialised: boolean = false;

  duration: number = 0;

  constructor(trackConfigs: TrackConfig[]) {
    this.context = new AudioContext();

    this.ready = this.createTracks(trackConfigs);

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

        this.audioTracks.push(audioTrack);

        return audioTrack;
      }),
    );
  }

  start(offset: number = 0) {
    const time = this.context.currentTime + 0.5;
    this.audioTracks.forEach((track) => track.start(time, offset));
    this.isInitialised = true;
  }

  stop() {
    this.audioTracks.forEach((track) => track.stop());
    this.isInitialised = false;
  }

  pause() {
    this.context.suspend();
  }

  resume() {
    this.context.resume();
  }
}
