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
    this.gainNodes = new Array(buffers.length).fill(null).map(() => {
      const gainNode = context.createGain();

      gainNode.connect(this.context.destination);

      return gainNode;
    });

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
    this.sources = this.buffers.map((buffer, index) => {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.start(at, offset);

      source.connect(this.gainNodes[index]);

      return source;
    });
  }

  stop() {
    this.sources.forEach((source) => {
      source.stop(0);
      source.disconnect();
    });

    this.sources = [];
  }

  destroy() {
    this.stop();

    this.gainNodes.forEach((node) => {
      node.disconnect();
    });
    this.gainNodes = [];
  }
}
