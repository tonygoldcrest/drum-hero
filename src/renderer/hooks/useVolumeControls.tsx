import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AudioPlayer } from '../services/audio-player/player';
import { TrackConfig } from '../services/audio-player/types';
import { AudioVolume } from '../components/AudioVolume';

interface VolumeControl {
  trackName: string;
  volume: number;
  previousVolume?: number;
  isMuted: boolean;
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

  useEffect(() => {
    if (trackData.length === 0) {
      return;
    }

    setVolumeControls(
      trackData.map(({ name }) => ({
        trackName: name,
        volume: 100,
        isMuted: false,
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
        (track) => track.name === control.trackName,
      );

      if (!audioTrack) {
        return;
      }

      audioTrack.setVolume(control.volume / 100);
    });
  }, [volumeControls, audioPlayer]);

  const handleMute = useCallback(
    (control: VolumeControl) => {
      if (control.isMuted) {
        setVolumeControls([
          ...volumeControls.filter((c) => c !== control),
          {
            ...control,
            volume: control.previousVolume ?? 100,
            previousVolume: undefined,
            isMuted: false,
          },
        ]);
      } else {
        setVolumeControls([
          ...volumeControls.filter((c) => c !== control),
          {
            ...control,
            volume: 0,
            previousVolume: control.volume,
            isMuted: true,
          },
        ]);
      }
    },
    [volumeControls],
  );
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
              isMuted: true,
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
              isMuted: false,
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
            isMuted: false,
            previousVolume: undefined,
            volume: c.previousVolume ?? 100,
          })),
          { ...control, isSoloed: false },
        ]);
      } else {
        setVolumeControls([
          ...otherControls.map((c) => ({
            ...c,
            isMuted: true,
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

    return volumeControls
      .sort((a, b) => a.trackName.localeCompare(b.trackName))
      .map((control) => (
        <AudioVolume
          key={control.trackName}
          name={control.trackName}
          volume={control.volume}
          isMuted={control.isMuted}
          isSoloed={control.isSoloed}
          onMuteClick={() => handleMute(control)}
          onSoloClick={() => handleSolo(control)}
          onChange={(value) =>
            setVolumeControls([
              ...volumeControls.filter((c) => c !== control),
              { ...control, volume: value },
            ])
          }
        />
      ));
  }, [volumeControls, audioPlayer, handleMute, handleSolo]);

  return { volumeControls, volumeSliders };
}
