import { useCallback, useEffect, useMemo, useState } from 'react';

import { Layout, Select, Switch } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FullHeightLayout,
  Sidebar,
  LayoutContent,
  Title,
  SheetMusicView,
  SecondaryText,
  DifficultySelect,
  DifficultyConfig,
} from './styles';
import { IpcLoadSongResponse, SongData } from '../../../types';
import { SheetMusic } from '../../components/SheetMusic/SheetMusic';
import { AudioPlayer } from '../../services/audio-player/player';
import { Playback } from '../../components/Playback/Playback';
import { SettingsMenu } from '../../components/SettingsMenu/SettingsMenu';
import { AudioVolume } from '../../components/AudioVolume/AudioVolume';
import { TrackConfig } from '../../services/audio-player/types';
import { Difficulty } from '../../../midi-parser/parser';

export function SongView() {
  const [midiData, setMidiData] = useState<Buffer>();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [showBarNumbers, setShowBarNumbers] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.expert);
  const [currentPlayback, setCurrentPlayback] = useState(0);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayer | null>(null);
  const [trackData, setTrackData] = useState<TrackConfig[]>([]);

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

        setTrackData([{ name: 'drums', urls: drums }, ...other]);
      },
    );
    window.electron.ipcRenderer.sendMessage('load-song', id);
  }, [id]);

  useEffect(() => {
    if (trackData.length === 0) {
      return;
    }
    const player = new AudioPlayer(trackData);

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

    // const endedListener = () => {
    //   setIsPlaying(false);
    // };
    const audioPolling = setInterval(playbackEventListener, 20);

    return () => {
      clearInterval(audioPolling);

      audioPlayer.stop();
      // audioPlayer.destroy();
    };
  }, [audioPlayer]);

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
    if (!audioPlayer) {
      return [];
    }

    return audioPlayer.audioTracks
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((track) => {
        return (
          <AudioVolume
            key={track.name}
            name={track.name}
            volume={track.volume}
            onChange={(value) => track.setVolume(value / 100)}
          />
        );
      });
  }, [audioPlayer]);

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
            <DifficultyConfig>
              <SecondaryText>Difficulty</SecondaryText>
              <DifficultySelect
                value={difficulty}
                options={Object.values(Difficulty).map((diff) => ({
                  value: diff,
                  label: <span>{diff}</span>,
                }))}
                onChange={(value) => setDifficulty(value as Difficulty)}
              />
            </DifficultyConfig>
            {...volumeSliders}
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
                  midiData={midiData}
                  difficulty={difficulty}
                  showBarNumbers={showBarNumbers}
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
