export class AudioTrack {
  private gainNodes: GainNode[];

  private _volume: number = 1;

  private sources: AudioBufferSourceNode[] = [];

  duration: number;

  constructor(
    public buffers: AudioBuffer[],
    public name: string,
    public context: AudioContext,
  ) {
    this.gainNodes = new Array(buffers.length)
      .fill(null)
      .map(() => context.createGain());

    this.duration = Math.max(...this.buffers.map((buffer) => buffer.duration));
  }

  get volume() {
    return this._volume;
  }

  setVolume(newVolume: number) {
    this.gainNodes.forEach((gainNode) => {
      gainNode.gain.setValueAtTime(newVolume, this.context.currentTime);
    });
  }

  start(at: number, offset: number) {
    this.sources = this.buffers.map((buffer) => {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.start(at, offset);
      return source;
    });
  }

  stop() {
    this.sources.forEach((source) => source.stop(0));
    this.sources = [];
  }
}
