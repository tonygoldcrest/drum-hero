import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AudioPlayer } from '../services/audio-player/player';
import { TrackConfig } from '../services/audio-player/types';
import { AudioVolume } from '../components/AudioVolume';
import { useApp } from '../context/AppContext';

interface VolumeControl {
  stemName: string;
  volume: number;
  previousVolume?: number;
  isSoloed: boolean;
}

interface VolumeControlsResult {
  volumeControls: VolumeControl[];
  volumeSliders: React.ReactElement[];
}

export function useVolumeControls(
  trackData: TrackConfig[],
  audioPlayer: AudioPlayer | null,
): VolumeControlsResult {
  const [volumeControls, setVolumeControls] = useState<VolumeControl[]>([]);
  const { mixerLevels, setMixerLevels } = useApp();
  const mixerLevelsRef = useRef(mixerLevels);
  const volumeControlsRef = useRef(volumeControls);

  mixerLevelsRef.current = mixerLevels;
  volumeControlsRef.current = volumeControls;

  const updateControlRef = useRef(
    (
      stemName: string,
      control: Partial<VolumeControl> & { volume: number },
    ) => {
      setMixerLevels({
        ...mixerLevelsRef.current,
        [stemName]: control.volume,
      });

      const prev = volumeControlsRef.current.find(
        (c) => c.stemName === stemName,
      );

      setVolumeControls([
        ...volumeControlsRef.current.filter((c) => c.stemName !== stemName),
        {
          ...prev,
          ...control,
        } as VolumeControl,
      ]);
    },
  );

  useEffect(() => {
    if (trackData.length === 0) {
      return;
    }

    setVolumeControls(
      trackData.map(({ name }) => ({
        stemName: name,
        volume: mixerLevelsRef.current[name] ?? 100,
        isSoloed: false,
      })),
    );
  }, [trackData]);

  useEffect(() => {
    if (volumeControls.length === 0 || !audioPlayer) {
      return;
    }

    volumeControls.forEach((control) => {
      const audioTrack = audioPlayer.audioTracks.find(
        (track) => track.name === control.stemName,
      );

      if (!audioTrack) {
        return;
      }

      audioTrack.setVolume(control.volume / 100);
    });
  }, [volumeControls, audioPlayer]);

  const handleMute = useCallback((control: VolumeControl) => {
    if (control.volume === 0) {
      updateControlRef.current(control.stemName, {
        volume: control.previousVolume ?? 100,
        previousVolume: undefined,
      });
    } else {
      updateControlRef.current(control.stemName, {
        volume: 0,
        previousVolume: control.volume,
      });
    }
  }, []);
  const handleSolo = useCallback(
    (control: VolumeControl) => {
      const otherControls = volumeControls.filter((c) => c !== control);
      const anyOtherSoloed = otherControls.some((c) => c.isSoloed);

      if (anyOtherSoloed) {
        if (control.isSoloed) {
          setVolumeControls([
            ...otherControls,
            {
              ...control,
              isSoloed: false,
              volume: 0,
              previousVolume: control.volume,
            },
          ]);
        } else {
          setVolumeControls([
            ...otherControls,
            {
              ...control,
              isSoloed: true,
              volume: control.previousVolume ?? 100,
              previousVolume: undefined,
            },
          ]);
        }

        return;
      }

      if (control.isSoloed) {
        setVolumeControls([
          ...otherControls.map((c) => ({
            ...c,
            previousVolume: undefined,
            volume: c.previousVolume ?? 100,
          })),
          { ...control, isSoloed: false },
        ]);
      } else {
        setVolumeControls([
          ...otherControls.map((c) => ({
            ...c,
            previousVolume: c.volume,
            volume: 0,
          })),
          { ...control, isSoloed: true },
        ]);
      }
    },
    [volumeControls],
  );
  const volumeSliders = useMemo(() => {
    if (volumeControls.length === 0 || !audioPlayer) {
      return [];
    }

    return [...volumeControls]
      .sort((a, b) => a.stemName.localeCompare(b.stemName))
      .map((control) => (
        <AudioVolume
          key={control.stemName}
          name={control.stemName}
          volume={control.volume}
          isMuted={control.volume === 0}
          isSoloed={control.isSoloed}
          onMuteClick={() => handleMute(control)}
          onSoloClick={() => handleSolo(control)}
          onChange={(value) => {
            updateControlRef.current(control.stemName, {
              volume: value,
            });
          }}
        />
      ));
  }, [volumeControls, audioPlayer, handleMute, handleSolo]);

  return { volumeControls, volumeSliders };
}
