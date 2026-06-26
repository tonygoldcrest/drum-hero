import { TrackConfig } from './audio-player/types';
import { TimeStore } from './time-store';
import { Measure, ParsedChart, RenderData } from '../../chart-parser/types';
import { MidiDevice, MidiMapping, MidiMessage, ScoreData } from '../../types';
import { PlayheadStyle } from '../types';
import { PlaybackEngine, PlaybackSnapshot } from './playback-engine';
import { ScoringEngine } from './scoring-engine';
import { ViewEngine, ViewRefs } from './view-engine';
import { secondsToTicks } from '../views/utils';

export interface GameEngineOptions {
  trackData: TrackConfig[];
  isDev: boolean;
  onEnded: (score: ScoreData) => void;
  onError: () => void;
}

export interface GameContext {
  chart: ParsedChart | undefined;
  measures: Measure[];
  renderData: RenderData[];
  delaySeconds: number;
  countInEnabled: boolean;
}

export interface GameSettings {
  playheadStyle: PlayheadStyle;
  progressColoring: boolean;
}

export type GameView = ViewRefs;

export class GameEngine {
  private playback: PlaybackEngine;
  private scoring = new ScoringEngine();
  private view = new ViewEngine((tick, key) => this.scoring.isHit(tick, key));
  private onEndedCb: (score: ScoreData) => void;
  private chart: ParsedChart | undefined;
  private renderData: RenderData[] = [];
  private delaySeconds = 0;
  private midiMapping: MidiMapping = {};
  private device: MidiDevice | null = null;
  private midiUnsub: (() => void) | undefined;
  private timeUnsub: () => void;
  private playbackUnsub: () => void;

  constructor(options: GameEngineOptions) {
    this.onEndedCb = options.onEnded;
    this.playback = new PlaybackEngine({
      trackData: options.trackData,
      isDev: options.isDev,
      onEnded: () => this.handleEnded(),
      onError: options.onError,
    });
    this.timeUnsub = this.playback.timeStore.subscribe(this.handleFrame);
    this.playbackUnsub = this.playback.subscribe(this.handlePlaybackChange);
    this.scoring.onHit((note, prefixes) => this.view.paintHit(note, prefixes));
  }

  get timeStore(): TimeStore {
    return this.playback.timeStore;
  }

  subscribe = (listener: () => void): (() => void) =>
    this.playback.subscribe(listener);

  getSnapshot = (): PlaybackSnapshot => this.playback.getSnapshot();

  setContext(context: GameContext): void {
    this.chart = context.chart;
    this.renderData = context.renderData;
    this.delaySeconds = context.delaySeconds;
    this.view.setContext({
      chart: context.chart,
      renderData: context.renderData,
    });
    this.playback.setContext({
      chart: context.chart,
      measures: context.measures,
      delaySeconds: context.delaySeconds,
      countInEnabled: context.countInEnabled,
    });
    this.scoring.setContext({
      chart: context.chart,
      renderData: context.renderData,
      midiMapping: this.midiMapping,
    });

    this.renderFrame();
  }

  setSettings(settings: GameSettings): void {
    this.view.setSettings(settings.playheadStyle, settings.progressColoring);
    this.renderFrame();
  }

  setMidi(device: MidiDevice | null, mapping: MidiMapping): void {
    this.midiMapping = mapping;
    this.scoring.setContext({
      chart: this.chart,
      renderData: this.renderData,
      midiMapping: mapping,
    });

    if (device !== this.device) {
      this.device = device;
      this.connectMidi();
    }
  }

  setView(view: GameView): void {
    this.view.setRefs(view);
    this.renderFrame();
  }

  setDev(isDev: boolean): void {
    this.playback.setDev(isDev);
  }

  play(): void {
    this.playback.play();
  }

  playFromTick(tick: number): void {
    this.playback.playFromTick(tick);
  }

  pause(): void {
    this.playback.pause();
  }

  cancel(): void {
    this.playback.cancel();
  }

  seekSeconds(seconds: number): void {
    this.playback.seekSeconds(seconds);
  }

  setStemVolume(name: string, gain: number): void {
    this.playback.setStemVolume(name, gain);
  }

  renderFrame(): void {
    if (!this.chart) {
      return;
    }

    const chartTime = this.playback.timeStore.get() - this.delaySeconds;
    const tick = secondsToTicks(
      chartTime,
      this.chart.resolution,
      this.chart.tempos,
    );

    this.scoring.setTick(tick);
    this.view.render(chartTime, tick);
  }

  dispose(): void {
    this.timeUnsub();
    this.playbackUnsub();
    this.midiUnsub?.();
    this.playback.dispose();
  }

  private handleFrame = (): void => {
    this.renderFrame();
  };

  private handlePlaybackChange = (): void => {
    this.scoring.setEnabled(this.playback.getSnapshot().isPlaying);
  };

  private handleEnded(): void {
    this.onEndedCb({
      hitNotes: this.scoring.hitCount,
      falseHits: this.scoring.falseHitCount,
      totalNotes: this.totalNotes(),
    });
  }

  private totalNotes(): number {
    return this.renderData
      .flatMap((rd) => rd.measure.notes)
      .filter((note) => !note.isRest)
      .reduce((sum, note) => sum + note.notes.length, 0);
  }

  private connectMidi(): void {
    this.midiUnsub?.();
    this.midiUnsub = undefined;

    if (!this.device) {
      return;
    }

    this.midiUnsub = window.electron.ipcRenderer.on<MidiMessage>(
      'listen-midi',
      (message) => this.scoring.handleMidiMessage(message),
    );
  }
}
