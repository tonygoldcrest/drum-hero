import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, Layout, Slider, Switch, Typography, theme } from 'antd';
import { MidiJSON } from '@tonejs/midi';
import {
  ArrowLeftOutlined,
  CaretRightOutlined,
  SettingOutlined,
  VerticalRightOutlined,
} from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { renderMusic } from '../MidiRenderer';
import { Channels } from '../../main/preload';
import { Song } from '../../midi-parser/song';
import {
  FullHeightLayout,
  SettingsItem,
  SettingsMenu,
  SheetMusicView,
} from './styles';
import { SongData } from '../types';

export function SongView() {
  const divRef = useRef<HTMLDivElement>(null);
  const [midiData, setMidiData] = useState<MidiJSON>();
  const [song, setSong] = useState<Song | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showBarNumbers, setShowBarNumbers] = useState(false);
  const [songInfo, setSongInfo] = useState<SongData | null>(null);

  const { id } = useParams();

  const loadSong = useCallback(
    (type: Channels) => {
      window.electron.ipcRenderer.on(type, ({ info, midi }) => {
        setMidiData(midi as MidiJSON);
        setSongInfo(info);
      });
      window.electron.ipcRenderer.sendMessage(type, [id]);
    },
    [id],
  );

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
    loadSong('load');
  }, [loadSong]);

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

  if (!songInfo) {
    return null;
  }

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
            <Link to={{ pathname: '/' }}>
              <Button
                shape={collapsed ? 'circle' : 'round'}
                style={{ width: '100%' }}
                size="large"
                icon={<ArrowLeftOutlined />}
                onClick={() => renderSheetMusic()}
              />
            </Link>
          </SettingsItem>
          <SettingsItem>
            <Button
              shape={collapsed ? 'circle' : 'round'}
              style={{ width: '100%' }}
              type="primary"
              size="large"
              icon={<CaretRightOutlined />}
              onClick={() => renderSheetMusic()}
            />
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
              <Slider defaultValue={30} />
              <Slider defaultValue={30} />
              <Slider defaultValue={30} />
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
              {songInfo.song.name} by {songInfo.song.artist}
            </Typography.Title>
            <div style={{ margin: '0 auto' }} ref={divRef} />
          </SheetMusicView>
        </Layout>
      </Layout>
    </FullHeightLayout>
  );
}
