import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import { AudioPlayer } from '../services/audio-player/player';
import { TrackConfig } from '../services/audio-player/types';
import { TimeStore } from '../services/time-store';

interface AudioPlayerResult {
  audioPlayer: AudioPlayer | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  timeStore: TimeStore;
}

export function useAudioPlayer(
  trackData: TrackConfig[],
  isDev: boolean,
  onEnded: () => void,
): AudioPlayerResult {
  const { notification } = App.useApp();
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeStore] = useState(() => new TimeStore());
  const onEndedRef = useRef(onEnded);

  onEndedRef.current = onEnded;

  useEffect(() => {
    if (trackData.length === 0) {
      return;
    }

    const player = new AudioPlayer(trackData, () => {
      setIsPlaying(false);
      onEndedRef.current?.();
    });

    player.ready
      .then(() => setAudioPlayer(player))
      .catch(() => {
        notification.error({
          message: 'Audio failed to load',
          description:
            'One or more audio tracks could not be loaded for this song.',
          placement: 'bottomRight',
        });
      });
  }, [trackData, notification]);
  useEffect(() => {
    if (audioPlayer === null) {
      return undefined;
    }

    let rafId = requestAnimationFrame(function poll() {
      timeStore.set(audioPlayer.currentTime);
      rafId = requestAnimationFrame(poll);
    });

    return () => {
      cancelAnimationFrame(rafId);

      if (isDev) {
        audioPlayer.stop();
      } else {
        audioPlayer.destroy();
      }
    };
  }, [audioPlayer, isDev, timeStore]);
  useEffect(() => {
    if (audioPlayer === null) {
      return;
    }

    if (isPlaying && !audioPlayer.isInitialised) {
      audioPlayer.start();
    } else if (isPlaying) {
      audioPlayer.resume();
    } else if (!isPlaying && audioPlayer.isInitialised) {
      audioPlayer.pause();
    }
  }, [audioPlayer, isPlaying]);

  return { audioPlayer, isPlaying, setIsPlaying, timeStore };
}
