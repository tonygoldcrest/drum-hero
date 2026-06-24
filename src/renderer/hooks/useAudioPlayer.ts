import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import { AudioPlayer } from '../services/audio-player/player';
import { TrackConfig } from '../services/audio-player/types';

export function useAudioPlayer(
  trackData: TrackConfig[],
  isDev: boolean,
  onEnded: () => void,
): AudioPlayer | null {
  const { notification } = App.useApp();
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayer | null>(null);
  const onEndedRef = useRef(onEnded);
  const isDevRef = useRef(isDev);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    isDevRef.current = isDev;
  }, [isDev]);

  useEffect(() => {
    if (trackData.length === 0) {
      return undefined;
    }

    const player = new AudioPlayer(trackData, () => onEndedRef.current());

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

    return () => {
      if (isDevRef.current) {
        player.stop();
      } else {
        player.destroy();
      }

      setAudioPlayer(null);
    };
  }, [trackData, notification]);

  return audioPlayer;
}
