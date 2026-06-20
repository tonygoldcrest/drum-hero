import { useEffect, useState } from 'react';
import { App } from 'antd';
import { AudioPlayer } from '../services/audio-player/player';
import { TrackConfig } from '../services/audio-player/types';

interface AudioPlayerResult {
  audioPlayer: AudioPlayer | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentPlayback: number;
}

export function useAudioPlayer(
  trackData: TrackConfig[],
  isDev: boolean,
): AudioPlayerResult {
  const { notification } = App.useApp();
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayback, setCurrentPlayback] = useState(0);

  useEffect(() => {
    if (trackData.length === 0) {
      return;
    }

    const player = new AudioPlayer(trackData, () => setIsPlaying(false));

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

    const audioPolling = setInterval(() => {
      setCurrentPlayback(audioPlayer.currentTime);
    }, 20);

    return () => {
      clearInterval(audioPolling);

      if (isDev) {
        audioPlayer.stop();
      } else {
        audioPlayer.destroy();
      }
    };
  }, [audioPlayer, isDev]);
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

  return { audioPlayer, isPlaying, setIsPlaying, currentPlayback };
}
