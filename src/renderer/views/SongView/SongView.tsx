import { useCallback, useEffect, useState } from 'react';

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

export function SongView() {
  const [midiData, setMidiData] = useState<Buffer>();
  const [collapsed, setCollapsed] = useState(true);
  const [showBarNumbers, setShowBarNumbers] = useState(false);
  const [currentPlayback, setCurrentPlayback] = useState(0);
  const [audioDuration, setAudioDuration] = useState(1);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();

  const loadSong = useCallback(() => {
    window.electron.ipcRenderer.on<IpcLoadSongResponse>(
      'load-song',
      ({ data, midi, audio }) => {
        setMidiData(midi);
        setSongData(data);

        const drumsAudio = audio
          .filter((file) => file.name.includes('drums'))
          .map((drumsFile) => new Audio(drumsFile.src));

        const otherTracks = audio.filter(
          (file) => !file.name.includes('drums'),
        );

        const audios = otherTracks.map((file) => ({
          ...file,
          element: [new Audio(file.src)],
        }));

        if (drumsAudio.length !== 0) {
          audios.push({
            src: '',
            element: drumsAudio,
            name: 'drums',
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

  useEffect(() => {
    if (audioFiles.length === 0) {
      return undefined;
    }

    const audioElement = audioFiles[0].element[0];

    const playbackEventListener = () => {
      setCurrentPlayback(audioElement.currentTime);
    };

    const readyEventListener = () => {
      setAudioDuration(audioElement.duration);
    };

    const audioPolling = setInterval(playbackEventListener, 30);
    audioElement.addEventListener('canplaythrough', readyEventListener);

    return () => {
      clearInterval(audioPolling);
      audioElement.removeEventListener('canplaythrough', readyEventListener);
    };
  }, [audioFiles]);

  useEffect(() => {
    return () => {
      audioFiles.forEach((audio) => {
        audio.element.forEach((drumAudio) => {
          drumAudio.pause();
        });
      });
    };
  }, [audioFiles]);

  useEffect(() => {
    if (audioFiles.length === 0) {
      return;
    }

    if (isPlaying) {
      audioFiles.forEach((audio) => {
        audio.element.forEach((drumAudio) => {
          drumAudio.play();
        });
      });
    } else {
      audioFiles.forEach((audio) => {
        audio.element.forEach((drumAudio) => {
          drumAudio.pause();
        });
      });
    }
  }, [audioFiles, isPlaying]);

  const volumeSliders = audioFiles.map((file, index) => {
    return (
      <div key={index}>
        <div>{file.name}</div>
        <Slider
          defaultValue={100}
          onChange={(value) => {
            file.element.forEach((drumAudio) => {
              drumAudio.volume = value / 100;
            });
          }}
        />
      </div>
    );
  });

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
              tooltipVisible={false}
              style={{
                flexGrow: 1,
              }}
              value={(currentPlayback / audioDuration) * 100}
              onChange={(value) => {
                const time = (value / 100) * audioDuration;
                audioFiles.forEach((audioFile) => {
                  audioFile.element.forEach((element) => {
                    element.currentTime = time;
                  });
                });
              }}
            />
            <PlaybackTime>
              {format(currentPlayback)} / {format(audioDuration)}
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
                      audioFile.element.forEach((element) => {
                        element.currentTime = time;
                      });
                    });
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
