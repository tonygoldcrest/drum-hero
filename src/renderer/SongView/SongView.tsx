import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, Layout, Slider, Switch, Typography, theme } from 'antd';
import { MidiJSON } from '@tonejs/midi';
import {
  ArrowLeftOutlined,
  CaretRightOutlined,
  PauseOutlined,
  SettingOutlined,
  VerticalRightOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { renderMusic } from '../MidiRenderer';
import { Song } from '../../midi-parser/song';
import {
  FullHeightLayout,
  SettingsItem,
  SettingsMenu,
  SheetMusicView,
} from './styles';
import { AudioFile } from '../types';
import { IpcLoadSongResponse, SongData } from '../../types';

export function SongView() {
  const divRef = useRef<HTMLDivElement>(null);
  const [midiData, setMidiData] = useState<MidiJSON>();
  const [song, setSong] = useState<Song | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showBarNumbers, setShowBarNumbers] = useState(false);
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
    if (!divRef.current || !song) {
      return;
    }

    if (divRef.current?.children.length > 0) {
      divRef.current.removeChild(divRef.current.children[0]);
    }

    renderMusic(divRef, song, showBarNumbers);
  }, [song, showBarNumbers]);

  useEffect(() => {
    loadSong();
  }, [loadSong]);

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

    setSong(new Song(midiData));
  }, [midiData]);

  useEffect(() => {
    renderSheetMusic();
  }, [renderSheetMusic]);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  if (!songData) {
    return null;
  }

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
          style={{
            background: colorBgContainer,
          }}
          trigger={null}
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
        >
          <SettingsItem>
            <Button
              shape={collapsed ? 'circle' : 'round'}
              style={{ width: '100%' }}
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
                shape={collapsed ? 'circle' : 'round'}
                style={{ width: '100%' }}
                type="primary"
                size="large"
                icon={<PauseOutlined />}
                onClick={() => {
                  setIsPlaying(false);
                }}
              />
            ) : (
              <Button
                shape={collapsed ? 'circle' : 'round'}
                style={{ width: '100%' }}
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
              shape={collapsed ? 'circle' : 'round'}
              style={{ width: '100%' }}
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
          <SheetMusicView
            background={colorBgContainer}
            borderRadius={borderRadiusLG}
          >
            <Typography.Title>
              {songData.name} by {songData.artist}
            </Typography.Title>
            <div style={{ margin: '0 auto' }} ref={divRef} />
          </SheetMusicView>
        </Layout>
      </Layout>
    </FullHeightLayout>
  );
}
