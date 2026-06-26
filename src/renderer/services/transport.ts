import { AudioPlayer } from './audio-player/player';
import { TrackConfig } from './audio-player/types';
import { TimeStore } from './time-store';
import { Measure, ParsedChart } from '../../chart-parser/types';
import { getCountIn, secondsToTicks, ticksToSeconds } from '../views/utils';
import { playMetronome, preloadMetronome } from './metronome';

export type PlaybackState =
  | 'idle'
  | 'parked'
  | 'counting-in'
  | 'playing'
  | 'ended';

export interface TransportContext {
  chart: ParsedChart | undefined;
  measures: Measure[];
  delaySeconds: number;
  countInEnabled: boolean;
}

export interface PlaybackSnapshot {
  state: PlaybackState;
  isPlaying: boolean;
  isCounting: boolean;
  isStarted: boolean;
  isEnded: boolean;
  countInBeat: number | undefined;
  countInBeatMs: number | undefined;
  isReady: boolean;
  duration: number;
}

export interface TransportOptions {
  trackData: TrackConfig[];
  isDev: boolean;
  onEnded: () => void;
  onError: () => void;
}

const SNAPSHOT_KEYS: (keyof PlaybackSnapshot)[] = [
  'state',
  'isPlaying',
  'isCounting',
  'isStarted',
  'isEnded',
  'countInBeat',
  'countInBeatMs',
  'isReady',
  'duration',
];

export class Transport {
  readonly timeStore = new TimeStore();
  private isDev: boolean;
  private onEndedCb: () => void;
  private onErrorCb: () => void;
  private chart: ParsedChart | undefined;
  private measures: Measure[] = [];
  private delaySeconds = 0;
  private countInEnabled = false;
  private createdPlayer: AudioPlayer | undefined;
  private audioPlayer: AudioPlayer | undefined;
  private state: PlaybackState = 'idle';
  private isStarted = false;
  private position = 0;
  private countInBeat: number | undefined;
  private countInBeatMs: number | undefined;
  private countRunId = 0;
  private countTimer: ReturnType<typeof setTimeout> | undefined;
  private raf: number | undefined;
  private disposed = false;
  private listeners = new Set<() => void>();
  private snapshot: PlaybackSnapshot;

  constructor(options: TransportOptions) {
    this.isDev = options.isDev;
    this.onEndedCb = options.onEnded;
    this.onErrorCb = options.onError;
    this.snapshot = this.buildSnapshot();

    preloadMetronome();

    if (options.trackData.length > 0) {
      this.initAudio(options.trackData);
    }

    this.startPolling();
  }

  setContext(context: TransportContext): void {
    this.chart = context.chart;
    this.measures = context.measures;
    this.delaySeconds = context.delaySeconds;
    this.countInEnabled = context.countInEnabled;
  }

  setDev(isDev: boolean): void {
    this.isDev = isDev;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): PlaybackSnapshot => this.snapshot;

  play(): void {
    if (!this.chart) {
      return;
    }

    const tick = secondsToTicks(
      Math.max(0, this.position - this.delaySeconds),
      this.chart.resolution,
      this.chart.tempos,
    );
    const measure = this.measures.find(
      (m) => tick >= m.startTick && tick < m.endTick,
    );

    this.playFromTick(measure?.startTick ?? 0);
  }

  playFromTick(tick: number): void {
    if (!this.chart || !this.audioPlayer) {
      return;
    }

    this.cancelCountIn();
    this.audioPlayer.stop();

    const startTime = this.tickToTime(tick);

    this.setPosition(startTime);

    const begin = () => {
      this.isStarted = true;
      this.state = 'playing';
      this.audioPlayer?.start(startTime);
      this.emit();
    };

    if (!this.countInEnabled) {
      begin();

      return;
    }

    const { beats, beatMs } = getCountIn(tick, this.measures, this.chart);

    this.state = 'counting-in';
    this.emit();
    this.startCountIn(beats, beatMs, begin);
  }

  pause(): void {
    if (!this.audioPlayer || this.state !== 'playing') {
      return;
    }

    this.setPosition(this.audioPlayer.currentTime);
    this.audioPlayer.pause();
    this.state = 'parked';
    this.emit();
  }

  cancel(): void {
    if (this.state !== 'counting-in') {
      return;
    }

    this.cancelCountIn();
    this.state = 'parked';
    this.emit();
  }

  seekSeconds(seconds: number): void {
    if (!this.audioPlayer) {
      return;
    }

    this.cancelCountIn();
    this.isStarted = true;
    this.state = 'playing';
    this.setPosition(seconds);
    this.audioPlayer.start(seconds);
    this.emit();
  }

  setStemVolume(name: string, gain: number): void {
    this.audioPlayer?.audioTracks
      .find((track) => track.name === name)
      ?.setVolume(gain);
  }

  dispose(): void {
    this.disposed = true;
    this.cancelCountIn();

    if (this.raf !== undefined && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.raf);
    }

    if (this.createdPlayer) {
      if (this.isDev) {
        this.createdPlayer.stop();
      } else {
        this.createdPlayer.destroy();
      }
    }

    this.listeners.clear();
  }

  private initAudio(trackData: TrackConfig[]): void {
    const player = new AudioPlayer(trackData, () => this.handleEnded());

    this.createdPlayer = player;

    player.ready
      .then(() => {
        if (this.disposed) {
          return;
        }

        this.audioPlayer = player;
        this.emit();
      })
      .catch(() => {
        if (this.disposed) {
          return;
        }

        this.onErrorCb();
      });
  }

  private startPolling(): void {
    if (typeof requestAnimationFrame !== 'function') {
      return;
    }

    const poll = () => {
      if (this.disposed) {
        return;
      }

      if (this.state === 'playing' && this.audioPlayer?.isInitialised) {
        this.setPosition(this.audioPlayer.currentTime);
      }

      this.raf = requestAnimationFrame(poll);
    };

    this.raf = requestAnimationFrame(poll);
  }

  private handleEnded(): void {
    this.state = 'ended';
    this.emit();
    this.onEndedCb();
  }

  private startCountIn(
    beats: number,
    beatMs: number,
    onComplete: () => void,
  ): void {
    this.countRunId += 1;

    const runId = this.countRunId;

    this.countInBeat = 1;
    this.countInBeatMs = beatMs;
    playMetronome();
    this.emit();

    const advance = () => {
      if (runId !== this.countRunId) {
        return;
      }

      if ((this.countInBeat ?? 0) >= beats) {
        this.countTimer = undefined;
        this.countInBeat = undefined;
        this.countInBeatMs = undefined;
        onComplete();

        return;
      }

      this.countInBeat = (this.countInBeat ?? 0) + 1;
      playMetronome();
      this.emit();
      this.countTimer = setTimeout(advance, beatMs);
    };

    this.countTimer = setTimeout(advance, beatMs);
  }

  private cancelCountIn(): void {
    this.countRunId += 1;

    if (this.countTimer !== undefined) {
      clearTimeout(this.countTimer);
      this.countTimer = undefined;
    }

    this.countInBeat = undefined;
    this.countInBeatMs = undefined;
  }

  private tickToTime(tick: number): number {
    return this.chart
      ? ticksToSeconds(tick, this.chart.resolution, this.chart.tempos) +
          this.delaySeconds
      : 0;
  }

  private setPosition(seconds: number): void {
    this.position = seconds;
    this.timeStore.set(seconds);
  }

  private buildSnapshot(): PlaybackSnapshot {
    return {
      state: this.state,
      isPlaying: this.state === 'playing',
      isCounting: this.state === 'counting-in',
      isStarted: this.isStarted,
      isEnded: this.state === 'ended',
      countInBeat: this.countInBeat,
      countInBeatMs: this.countInBeatMs,
      isReady: this.audioPlayer !== undefined,
      duration: this.audioPlayer?.duration ?? 0,
    };
  }

  private emit(): void {
    const next = this.buildSnapshot();

    if (SNAPSHOT_KEYS.every((key) => this.snapshot[key] === next[key])) {
      return;
    }

    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
}
