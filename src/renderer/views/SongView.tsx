import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Layout } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { useNavigate, useParams } from 'react-router-dom';
import { IpcLoadSongResponse, SongData } from '../../types';
import { SheetMusic } from '../components/SheetMusic/SheetMusic';
import { AudioPlayer } from '../services/audio-player/player';
import { Playback } from '../components/Playback';
import { SettingsButton } from '../components/SettingsButton';
import { AudioVolume } from '../components/AudioVolume';
import { TrackConfig } from '../services/audio-player/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { useSettings } from '../context/SettingsContext';

interface VolumeControl {
  trackName: string;
  volume: number;
  previousVolume?: number;
  isMuted: boolean;
  isSoloed: boolean;
}

export function SongView() {
  const [fileData, setFileData] = useState<Buffer>();
  const [format, setFormat] = useState<'mid' | 'chart'>('mid');
  const { difficulty, playheadStyle, enableColors, showBarNumbers } = useSettings();
  const [currentPlayback, setCurrentPlayback] = useState(0);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayer | null>(null);
  const [trackData, setTrackData] = useState<TrackConfig[]>([]);
  const [volumeControls, setVolumeControls] = useState<VolumeControl[]>([]);
  const [isDev, setIsDev] = useState(true);

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('prevent-sleep');

    return () => {
      window.electron.ipcRenderer.sendMessage('resume-sleep');
    };
  }, []);

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('check-dev');

    window.electron.ipcRenderer.once('check-dev', (dev: boolean) => {
      setIsDev(dev);
    });
  }, []);

  const loadSong = useCallback(() => {
    window.electron.ipcRenderer.once<IpcLoadSongResponse>(
      'load-song',
      ({ data, fileData: fd, format: fmt, audio }) => {
        setFileData(fd);
        setFormat(fmt);
        setSongData(data);

        const drums = audio
          .filter((file) => file.name.includes('drums'))
          .map((file) => file.src);

        const other = audio
          .filter((file) => !file.name.includes('drums'))
          .map((file) => ({ urls: [file.src], name: file.name }));

        setTrackData([
          ...(drums.length ? [{ name: 'drums', urls: drums }] : []),
          ...other,
        ]);
      },
    );
    window.electron.ipcRenderer.sendMessage('load-song', id);
  }, [id]);

  useEffect(() => {
    if (trackData.length === 0) {
      return;
    }
    const player = new AudioPlayer(trackData, () => setIsPlaying(false));

    setVolumeControls(
      trackData.map(({ name }) => ({
        trackName: name,
        volume: 100,
        isMuted: false,
        isSoloed: false,
      })),
    );

    player.ready
      .then(() => {
        return setAudioPlayer(player);
      })
      .catch(() => {});
  }, [trackData]);

  useEffect(() => {
    loadSong();
  }, [loadSong]);

  useEffect(() => {
    if (audioPlayer === null) {
      return undefined;
    }

    const playbackEventListener = () => {
      setCurrentPlayback(audioPlayer.currentTime);
    };

    const audioPolling = setInterval(playbackEventListener, 20);

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

  const volumeSliders = useMemo(() => {
    if (volumeControls.length === 0 || !audioPlayer) {
      return [];
    }

    return volumeControls
      .sort((a, b) => a.trackName.localeCompare(b.trackName))
      .map((control) => {
        return (
          <AudioVolume
            key={control.trackName}
            name={control.trackName}
            volume={control.volume}
            isMuted={control.isMuted}
            isSoloed={control.isSoloed}
            onMuteClick={() => {
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
            }}
            onSoloClick={() => {
              const otherControls = volumeControls.filter((c) => c !== control);

              if (otherControls.filter((c) => c.isSoloed).length > 0) {
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
                  {
                    ...control,
                    isSoloed: false,
                  },
                ]);
              } else {
                setVolumeControls([
                  ...otherControls.map((c) => ({
                    ...c,
                    isMuted: true,
                    previousVolume: c.volume,
                    volume: 0,
                  })),
                  {
                    ...control,
                    isSoloed: true,
                  },
                ]);
              }
            }}
            onChange={(value) =>
              setVolumeControls([
                ...volumeControls.filter((c) => c !== control),
                { ...control, volume: value },
              ])
            }
          />
        );
      });
  }, [volumeControls, audioPlayer]);

  return (
    <Layout className="h-full pointer-events-auto">
      <Layout>
        <Layout>
          <div
            className="flex items-center p-5 gap-5"
            style={{ background: 'var(--gradient-header)' }}
          >
            <Button
              icon={<FontAwesomeIcon icon={faArrowLeft} />}
              onClick={() => {
                setIsPlaying(false);
                navigate('/');
              }}
              size="large"
            />

            <Button
              type="primary"
              icon={<FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />}
              onClick={() => {
                setIsPlaying(!isPlaying);
              }}
              shape="circle"
              size="large"
              style={{ width: 50, height: 50 }}
            />

            <div>
              <div className="text-text-body font-ui text-[18px]">
                {songData?.name}
              </div>
              <div className="text-text-faint flex items-center gap-1">
                <div>{songData?.artist}</div>
                <div>·</div>
                <div>{difficulty}</div>
              </div>
            </div>

            <Playback
              currentTime={currentPlayback}
              disabled={!audioPlayer}
              duration={audioPlayer?.duration ?? 0}
              onChange={(value) => {
                if (!audioPlayer) {
                  return;
                }
                const time = (value / 100) * audioPlayer.duration;

                audioPlayer.start(time);
              }}
            />
            <SettingsButton volumeSliders={volumeSliders} />
          </div>
          <Content className="p-6 m-0 overflow-auto flex flex-col items-center font-display text-ink">
            {songData && (
              <div className="flex flex-col items-center min-w-max bg-paper rounded-[11px] p-10">
                <h1 className="my-0 mx-auto text-4xl text-ink font-semibold">
                  {songData.name}
                </h1>
                <div className="ml-auto text-[15px] italic font-bold flex flex-col items-end text-ink">
                  <div>Music by {songData.artist}</div>
                  <div>Arranged by {songData.charter}</div>
                </div>
                <SheetMusic
                  currentTime={currentPlayback}
                  fileData={fileData}
                  format={format}
                  difficulty={difficulty}
                  playheadStyle={playheadStyle}
                  showBarNumbers={showBarNumbers}
                  enableColors={enableColors}
                  isFiveLane={songData.five_lane_drums === 'True'}
                  onSelectMeasure={(time) => {
                    if (!audioPlayer) {
                      return;
                    }
                    audioPlayer.start(time);

                    setIsPlaying(true);
                  }}
                />
              </div>
            )}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
