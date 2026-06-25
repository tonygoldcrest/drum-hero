import { AudioTrack } from './track';
import { TrackConfig } from './types';
import { trimTrailingSilence } from './utils';

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
        const decodedBuffers = await Promise.all(
          dataBuffers.map((buf) => this.context.decodeAudioData(buf)),
        );
        const audioBuffers = decodedBuffers.map((buffer) =>
          trimTrailingSilence(buffer, this.context),
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

    if (this.context.state === 'suspended') {
      this.context.resume();
    }

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

  get outputLatency() {
    return this.context.outputLatency || this.context.baseLatency || 0;
  }

  get currentTime() {
    if (this.startedAt < 0) {
      return 0;
    }

    const latency = this.context.state === 'running' ? this.outputLatency : 0;

    return Math.max(
      this.offset,
      this.context.currentTime - this.startedAt + this.offset - latency,
    );
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
