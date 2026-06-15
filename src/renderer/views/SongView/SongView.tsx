import { useCallback, useEffect, useMemo, useState } from 'react';

import { Layout, Switch } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FullHeightLayout,
  Sidebar,
  LayoutContent,
  Title,
  SheetMusicView,
  SecondaryText,
  SelectWrapper,
  StyledSelect,
} from './styles';
import { IpcLoadSongResponse, SongData } from '../../../types';
import { SheetMusic } from '../../components/SheetMusic/SheetMusic';
import { AudioPlayer } from '../../services/audio-player/player';
import { Playback } from '../../components/Playback/Playback';
import { SettingsMenu } from '../../components/SettingsMenu/SettingsMenu';
import { AudioVolume } from '../../components/AudioVolume/AudioVolume';
import { TrackConfig } from '../../services/audio-player/types';
import { Difficulty } from '../../../chart-parser/types';
import { PLAYHEAD_STYLES, PlayheadStyle, VolumeControl } from './types';

export function SongView() {
  const [fileData, setFileData] = useState<Buffer>();
  const [format, setFormat] = useState<'mid' | 'chart'>('mid');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [showBarNumbers, setShowBarNumbers] = useState(false);
  const [enableColors, setEnableColors] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.expert);
  const [playheadStyle, setPlayheadStyle] = useState<PlayheadStyle>('Cursor');
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

        setTrackData([{ name: 'drums', urls: drums }, ...other]);
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
    <FullHeightLayout>
      <Layout>
        <Sidebar
          width={200}
          collapsedWidth={70}
          trigger={null}
          collapsible
          collapsed={!isSidebarExpanded}
          onCollapse={(value) => setIsSidebarExpanded(value)}
        >
          <SettingsMenu
            onBackClick={() => {
              setIsPlaying(false);
              navigate('/');
            }}
            isPlaying={isPlaying}
            onPlayClick={() => {
              setIsPlaying(!isPlaying);
            }}
            isExpanded={isSidebarExpanded}
            onExpandClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            isLoading={audioPlayer === null}
          >
            <SelectWrapper>
              <SecondaryText>Difficulty</SecondaryText>
              <StyledSelect
                value={difficulty}
                options={Object.values(Difficulty).map((diff) => ({
                  value: diff,
                  label: <span>{diff}</span>,
                }))}
                onChange={(value) => setDifficulty(value as Difficulty)}
              />
            </SelectWrapper>
            <SelectWrapper>
              <SecondaryText>Playhead Style</SecondaryText>
              <StyledSelect
                value={playheadStyle}
                options={PLAYHEAD_STYLES.map((style) => ({
                  value: style,
                  label: <span>{style}</span>,
                }))}
                onChange={(value) => setPlayheadStyle(value as PlayheadStyle)}
              />
            </SelectWrapper>
            {...volumeSliders}
            <>
              <Switch
                size="small"
                checked={enableColors}
                onChange={() => {
                  setEnableColors(!enableColors);
                }}
              />
              <SecondaryText>Enable colors</SecondaryText>
            </>
            <>
              <Switch
                size="small"
                checked={showBarNumbers}
                onChange={() => {
                  setShowBarNumbers(!showBarNumbers);
                }}
              />
              <SecondaryText>Show bar numbers</SecondaryText>
            </>
          </SettingsMenu>
        </Sidebar>
        <Layout style={{ padding: 10 }}>
          {audioPlayer && (
            <Playback
              currentTime={currentPlayback}
              duration={audioPlayer.duration}
              onChange={(value) => {
                const time = (value / 100) * audioPlayer.duration;

                audioPlayer.start(time);
              }}
            />
          )}
          <LayoutContent>
            {songData && (
              <SheetMusicView>
                <Title>
                  {songData.name} by {songData.artist}
                </Title>
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
              </SheetMusicView>
            )}
          </LayoutContent>
        </Layout>
      </Layout>
    </FullHeightLayout>
  );
}
