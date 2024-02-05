import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Layout, Slider, Switch } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faChevronLeft,
  faGear,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { useDebouncedCallback } from 'use-debounce';
import {
  FullHeightLayout,
  PlaybackContainer,
  PlaybackTime,
  SettingsItem,
  SettingsMenu,
  LayoutContent,
  Title,
  SheetMusicView,
} from './styles';
import { IpcLoadSongResponse, SongData } from '../../../types';
import { AudioFile } from '../../types';
import { format } from '../../util';
import { SheetMusic } from '../../components/SheetMusic/SheetMusic';
import { AudioPlayer } from '../../services/audio-player/player';

export function SongView() {
  const [midiData, setMidiData] = useState<Buffer>();
  const [collapsed, setCollapsed] = useState(true);
  const [showBarNumbers, setShowBarNumbers] = useState(false);
  const [currentPlayback, setCurrentPlayback] = useState(0);
  const [audioDuration, setAudioDuration] = useState(1);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayer | null>(null);

  const { id } = useParams();
  const navigate = useNavigate();

  const loadSong = useCallback(() => {
    window.electron.ipcRenderer.once<IpcLoadSongResponse>(
      'load-song',
      ({ data, midi, audio }) => {
        setMidiData(midi);
        setSongData(data);

        const drums = audio
          .filter((file) => file.name.includes('drums'))
          .map((file) => file.src);

        const other = audio
          .filter((file) => !file.name.includes('drums'))
          .map((file) => ({ urls: [file.src], name: file.name }));

        const player = new AudioPlayer([
          { name: 'drums', urls: drums },
          ...other,
        ]);

        player.ready
          .then(() => {
            return setAudioPlayer(player);
          })
          .catch(() => {});

        const drumsAudio = audio
          .filter((file) => file.name.includes('drums'))
          .map((drumsFile) => new Audio(drumsFile.src));

        const otherTracks = audio.filter(
          (file) => !file.name.includes('drums'),
        );

        const audios = otherTracks.map((file) => ({
          ...file,
          elements: [new Audio(file.src)],
          volume: 100,
        }));

        if (drumsAudio.length !== 0) {
          audios.push({
            src: '',
            elements: drumsAudio,
            name: 'drums',
            volume: 0,
          });
        }

        setAudioFiles(audios);
      },
    );
    window.electron.ipcRenderer.sendMessage('load-song', id);
  }, [id]);

  useEffect(() => {
    loadSong();
  }, [loadSong]);

  // useEffect(() => {
  //   if (audioFiles.length === 0) {
  //     return undefined;
  //   }

  //   const audioElement = audioFiles[0].elements[0];

  //   const playbackEventListener = () => {
  //     setCurrentPlayback(audioElement.currentTime);
  //   };

  //   const readyEventListener = () => {
  //     setAudioDuration(audioElement.duration);
  //   };

  //   const endedListener = () => {
  //     setIsPlaying(false);
  //   };

  //   const audioPolling = setInterval(playbackEventListener, 20);
  //   audioElement.addEventListener('canplaythrough', readyEventListener);

  //   audioElement.addEventListener('ended', endedListener);

  //   return () => {
  //     clearInterval(audioPolling);
  //     audioElement.removeEventListener('canplaythrough', readyEventListener);
  //     audioElement.removeEventListener('ended', endedListener);
  //   };
  // }, [audioFiles]);

  useEffect(() => {
    if (audioPlayer === null) {
      return undefined;
    }

    const playbackEventListener = () => {
      setCurrentPlayback(audioPlayer.context.currentTime);
    };

    // const readyEventListener = () => {
    //   setAudioDuration(audioPlayer.duration);
    // };

    // const endedListener = () => {
    //   setIsPlaying(false);
    // };

    const audioPolling = setInterval(playbackEventListener, 20);

    return () => {
      clearInterval(audioPolling);
    };
  }, [audioPlayer]);

  useEffect(() => {
    audioFiles.forEach((audio) => {
      audio.elements.forEach((element) => {
        element.volume = audio.volume / 100;
      });
    });

    return () => {
      audioFiles.forEach((audio) => {
        audio.elements.forEach((drumAudio) => {
          drumAudio.pause();
        });
      });
    };
  }, [audioFiles]);

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
    // if (audioFiles.length === 0) {
    //   return;
    // }

    // if (isPlaying) {
    //   audioFiles.forEach((audio) => {
    //     audio.elements.forEach((drumAudio) => {
    //       drumAudio.play();
    //     });
    //   });
    // } else {
    //   audioFiles.forEach((audio) => {
    //     audio.elements.forEach((drumAudio) => {
    //       drumAudio.pause();
    //     });
    //   });
    // }
  }, [audioPlayer, isPlaying]);

  const setVolume = useDebouncedCallback((file, volume) => {
    const otherFiles = audioFiles.filter((f) => f !== file);

    setAudioFiles([
      ...otherFiles,
      {
        ...file,
        volume,
      },
    ]);
  }, 300);

  const volumeSliders = useMemo(() => {
    return audioFiles
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((file) => {
        return (
          <div key={file.name}>
            <div>{file.name}</div>
            <Slider
              defaultValue={file.volume}
              onChange={(value) => {
                setVolume(file, value);
              }}
            />
          </div>
        );
      });
  }, [audioFiles, setVolume]);

  if (!audioPlayer) {
    return null;
  }

  return (
    <FullHeightLayout>
      <Layout>
        <SettingsMenu
          width={200}
          collapsedWidth={60}
          trigger={null}
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
        >
          <SettingsItem>
            <Button
              shape="circle"
              size="large"
              icon={<FontAwesomeIcon icon={faArrowLeft} />}
              onClick={() => {
                setIsPlaying(false);
                navigate('/');
              }}
            />
          </SettingsItem>
          <SettingsItem>
            <Button
              shape="circle"
              type="primary"
              size="large"
              icon={
                isPlaying ? (
                  <FontAwesomeIcon icon={faPause} />
                ) : (
                  <FontAwesomeIcon icon={faPlay} />
                )
              }
              onClick={() => {
                setIsPlaying(!isPlaying);
              }}
            />
          </SettingsItem>
          <SettingsItem>
            <Button
              shape="circle"
              size="large"
              icon={
                collapsed ? (
                  <FontAwesomeIcon icon={faGear} />
                ) : (
                  <FontAwesomeIcon icon={faChevronLeft} />
                )
              }
              onClick={() => setCollapsed(!collapsed)}
            />
          </SettingsItem>
          {!collapsed && (
            <div>
              {volumeSliders}
              <SettingsItem>
                <Switch
                  size="default"
                  checked={showBarNumbers}
                  onChange={() => {
                    setShowBarNumbers(!showBarNumbers);
                  }}
                />
                <div>Show bar numbers</div>
              </SettingsItem>
            </div>
          )}
        </SettingsMenu>
        <Layout style={{ padding: 10 }}>
          <PlaybackContainer>
            <Slider
              defaultValue={0}
              tooltip={{ open: false }}
              style={{
                flexGrow: 1,
              }}
              value={(currentPlayback / audioPlayer.duration) * 100}
              onChange={(value) => {
                const time = (value / 100) * audioDuration;
                audioFiles.forEach((audioFile) => {
                  audioFile.elements.forEach((element) => {
                    element.currentTime = time;
                  });
                });
              }}
            />
            <PlaybackTime>
              {format(currentPlayback)} / {format(audioPlayer.duration)}
            </PlaybackTime>
          </PlaybackContainer>
          <LayoutContent>
            {songData && (
              <SheetMusicView>
                <Title>
                  {songData.name} by {songData.artist}
                </Title>
                <SheetMusic
                  currentTime={currentPlayback}
                  midiData={midiData}
                  showBarNumbers={showBarNumbers}
                  onSelectMeasure={(time) => {
                    audioFiles.forEach((audioFile) => {
                      audioFile.elements.forEach((element) => {
                        element.currentTime = time;
                      });
                    });

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
