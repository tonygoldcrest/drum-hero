import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioPlayer } from '../services/audio-player/player';
import { TrackConfig } from '../services/audio-player/types';
import { TimeStore } from '../services/time-store';
import { Measure, ParsedChart } from '../../chart-parser/types';
import { getCountIn, secondsToTicks, ticksToSeconds } from '../views/utils';
import { useAudioPlayer } from './useAudioPlayer';
import { useCountIn } from './useCountIn';
import { playMetronome, preloadMetronome } from '../services/metronome';

export type PlaybackState =
  | 'idle'
  | 'parked'
  | 'counting-in'
  | 'playing'
  | 'ended';

interface UsePlaybackParams {
  trackData: TrackConfig[];
  chart: ParsedChart | null;
  measures: Measure[];
  delaySeconds: number;
  countInEnabled: boolean;
  isDev: boolean;
  onEnded: () => void;
}

interface UsePlaybackResult {
  audioPlayer: AudioPlayer | null;
  timeStore: TimeStore;
  state: PlaybackState;
  isPlaying: boolean;
  isCounting: boolean;
  isStarted: boolean;
  isEnded: boolean;
  countInBeat: number | undefined;
  countInBeatMs: number | undefined;
  play: () => void;
  playFromTick: (tick: number) => void;
  pause: () => void;
  cancel: () => void;
  seekSeconds: (seconds: number) => void;
}

export function usePlayback({
  trackData,
  chart,
  measures,
  delaySeconds,
  countInEnabled,
  isDev,
  onEnded,
}: UsePlaybackParams): UsePlaybackResult {
  const [timeStore] = useState(() => new TimeStore());
  const [state, setState] = useState<PlaybackState>('idle');
  const [isStarted, setIsStarted] = useState(false);
  const positionRef = useRef(0);
  const stateRef = useRef(state);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const audioPlayer = useAudioPlayer(trackData, isDev, () => {
    setState('ended');
    onEndedRef.current();
  });
  const {
    count: countInBeat,
    beatMs: countInBeatMs,
    start: startCountIn,
    cancel: cancelCountIn,
  } = useCountIn();
  const setPosition = useCallback(
    (seconds: number) => {
      positionRef.current = seconds;
      timeStore.set(seconds);
    },
    [timeStore],
  );

  useEffect(() => {
    preloadMetronome();
  }, []);

  useEffect(() => {
    if (countInBeat !== undefined) {
      playMetronome();
    }
  }, [countInBeat]);

  useEffect(() => {
    setState('idle');
    setIsStarted(false);
    setPosition(0);
  }, [audioPlayer, setPosition]);

  useEffect(() => {
    if (!audioPlayer) {
      return undefined;
    }

    let raf = requestAnimationFrame(function poll() {
      if (stateRef.current === 'playing' && audioPlayer.isInitialised) {
        setPosition(audioPlayer.currentTime);
      }

      raf = requestAnimationFrame(poll);
    });

    return () => cancelAnimationFrame(raf);
  }, [audioPlayer, setPosition]);

  const tickToTime = useCallback(
    (tick: number) =>
      chart
        ? ticksToSeconds(tick, chart.resolution, chart.tempos) + delaySeconds
        : 0,
    [chart, delaySeconds],
  );
  const playFromTick = useCallback(
    (tick: number) => {
      if (!chart || !audioPlayer) {
        return;
      }

      cancelCountIn();

      const startTime = tickToTime(tick);

      setPosition(startTime);

      const begin = () => {
        setIsStarted(true);
        setState('playing');
        audioPlayer.start(startTime);
      };

      if (!countInEnabled) {
        begin();

        return;
      }

      const { beats, beatMs } = getCountIn(tick, measures, chart);

      setState('counting-in');
      startCountIn({ beats, beatMs, onComplete: begin });
    },
    [
      chart,
      audioPlayer,
      countInEnabled,
      measures,
      tickToTime,
      setPosition,
      startCountIn,
      cancelCountIn,
    ],
  );
  const play = useCallback(() => {
    if (!chart) {
      return;
    }

    const tick = secondsToTicks(
      Math.max(0, positionRef.current - delaySeconds),
      chart.resolution,
      chart.tempos,
    );
    const measure = measures.find(
      (m) => tick >= m.startTick && tick < m.endTick,
    );

    playFromTick(measure?.startTick ?? 0);
  }, [chart, delaySeconds, measures, playFromTick]);
  const pause = useCallback(() => {
    if (!audioPlayer || stateRef.current !== 'playing') {
      return;
    }

    setPosition(audioPlayer.currentTime);
    audioPlayer.pause();
    setState('parked');
  }, [audioPlayer, setPosition]);
  const cancel = useCallback(() => {
    cancelCountIn();
    setState('parked');
  }, [cancelCountIn]);
  const seekSeconds = useCallback(
    (seconds: number) => {
      if (!audioPlayer) {
        return;
      }

      cancelCountIn();
      setIsStarted(true);
      setState('playing');
      setPosition(seconds);
      audioPlayer.start(seconds);
    },
    [audioPlayer, setPosition, cancelCountIn],
  );

  return {
    audioPlayer,
    timeStore,
    state,
    isPlaying: state === 'playing',
    isCounting: state === 'counting-in',
    isStarted,
    isEnded: state === 'ended',
    countInBeat,
    countInBeatMs,
    play,
    playFromTick,
    pause,
    cancel,
    seekSeconds,
  };
}
