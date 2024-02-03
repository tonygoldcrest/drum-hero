import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, Layout, Slider, Switch, Typography } from 'antd';
import { MidiJSON } from '@tonejs/midi';
import {
  ArrowLeftOutlined,
  CaretRightOutlined,
  PauseOutlined,
  SettingOutlined,
  VerticalRightOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FullHeightLayout,
  PlaybackContainer,
  PlaybackTime,
  SettingsItem,
  SettingsMenu,
  SheetMusicView,
} from './styles';
import { MidiParser } from '../../../midi-parser/parser';
import { IpcLoadSongResponse, SongData } from '../../../types';
import { AudioFile } from '../../types';
import { renderMusic } from '../../../midi-parser/renderer';
import { format } from '../../util';

export function SongView() {
  const divRef = useRef<HTMLDivElement>(null);
  const [midiData, setMidiData] = useState<MidiJSON>();
  const [parsedMidi, setParsedMidi] = useState<MidiParser | null>(null);
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
        setMidiData(midi as MidiJSON);
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

  const renderSheetMusic = useCallback(() => {
    if (!divRef.current || !parsedMidi) {
      return;
    }

    if (divRef.current?.children.length > 0) {
      divRef.current.removeChild(divRef.current.children[0]);
    }

    renderMusic(divRef, parsedMidi, showBarNumbers);
  }, [parsedMidi, showBarNumbers]);

  useEffect(() => {
    loadSong();
  }, [loadSong]);

  useEffect(() => {
    if (audioFiles.length === 0) {
      return;
    }

    const audioElement = audioFiles[0].element[0];

    const playbackEventListener = () => {
      setCurrentPlayback(audioElement.currentTime);
    };

    const readyEventListener = () => {
      setAudioDuration(audioElement.duration);
    };

    audioElement.addEventListener('timeupdate', playbackEventListener);
    audioElement.addEventListener('canplaythrough', readyEventListener);

    return () => {
      audioElement.removeEventListener('timeupdate', playbackEventListener);
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

  useEffect(() => {
    if (!divRef.current || !midiData) {
      return;
    }

    setParsedMidi(new MidiParser(midiData));
  }, [midiData]);

  useEffect(() => {
    renderSheetMusic();
  }, [renderSheetMusic]);

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
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                setIsPlaying(false);
                navigate('/');
              }}
            />
          </SettingsItem>
          <SettingsItem>
            {isPlaying ? (
              <Button
                shape="circle"
                type="primary"
                size="large"
                icon={<PauseOutlined />}
                onClick={() => {
                  setIsPlaying(false);
                }}
              />
            ) : (
              <Button
                shape="circle"
                type="primary"
                size="large"
                icon={<CaretRightOutlined />}
                onClick={() => {
                  setIsPlaying(true);
                }}
              />
            )}
          </SettingsItem>
          <SettingsItem>
            <Button
              shape="circle"
              size="large"
              icon={collapsed ? <SettingOutlined /> : <VerticalRightOutlined />}
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
          <SheetMusicView>
            {songData && (
              <>
                <Typography.Title>
                  {songData.name} by {songData.artist}
                </Typography.Title>
                <div style={{ margin: '0 auto' }} ref={divRef} />
              </>
            )}
          </SheetMusicView>
        </Layout>
      </Layout>
    </FullHeightLayout>
  );
}
