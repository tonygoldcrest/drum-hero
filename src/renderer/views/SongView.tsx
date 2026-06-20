import { useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Layout } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { useNavigate, useParams } from 'react-router-dom';
import { SheetMusic } from '../components/SheetMusic/SheetMusic';
import { Playback } from '../components/Playback';
import { SettingsButton } from '../components/SettingsButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { useSettings } from '../context/SettingsContext';
import { Difficulty, parseChartFile } from 'scan-chart';
import { ChartParser } from '../../chart-parser/parser';
import { last } from 'es-toolkit';
import { useSongLoader } from '../hooks/useSongLoader';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useVolumeControls } from '../hooks/useVolumeControls';

export function SongView() {
  const { notification } = App.useApp();
  const { playheadStyle, enableColors, showBarNumbers, progressColoring } =
    useSettings();
  const [difficulty, setDifficulty] = useState<Difficulty>('expert');
  const [isDev, setIsDev] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();
  const { fileData, format, songData, trackData } = useSongLoader(id);
  const { audioPlayer, isPlaying, setIsPlaying, currentPlayback } =
    useAudioPlayer(trackData, isDev);
  const { volumeSliders } = useVolumeControls(trackData, audioPlayer);
  const audioLoading = trackData.length > 0 && !audioPlayer;

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

  const chart = useMemo(() => {
    if (!fileData) {
      return null;
    }

    return parseChartFile(new Uint8Array(fileData), format);
  }, [fileData, format]);
  const difficulties = useMemo(() => {
    if (!chart) {
      return [];
    }

    const trackDifficulties = chart.trackData
      .filter((t) => t.instrument === 'drums')
      .map((t) => t.difficulty);
    const allDifficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

    return allDifficulties.filter((d) => trackDifficulties.includes(d));
  }, [chart]);
  const activeDifficulty: Difficulty = difficulties.includes(difficulty)
    ? difficulty
    : last(difficulties) ?? 'expert';
  const [parsedMidi, setParsedMidi] = useState<ChartParser | null>(null);
  const lastParseKeyRef = useRef<string>('');

  useEffect(() => {
    if (!songData || !chart) {
      setParsedMidi(null);

      return;
    }

    const key = `${activeDifficulty}:${songData.id}`;

    if (key === lastParseKeyRef.current) {
      return;
    }

    lastParseKeyRef.current = key;

    try {
      setParsedMidi(
        new ChartParser(
          chart,
          songData.five_lane_drums === 'True',
          activeDifficulty,
        ),
      );
    } catch {
      setParsedMidi(null);
      notification.error({
        message: 'Chart parse failed',
        description:
          "This song's chart could not be parsed and cannot be displayed.",
        placement: 'bottomRight',
      });
    }
  }, [chart, songData, activeDifficulty, notification]);

  return (
    <Layout className="h-full pointer-events-auto">
      <div
        className="flex items-center p-4 gap-5"
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
          loading={audioLoading}
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
            <div>{activeDifficulty}</div>
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
        <SettingsButton
          page="song-view"
          volumeSliders={volumeSliders}
          difficulties={difficulties}
          onChangeDifficulty={setDifficulty}
          difficulty={activeDifficulty}
        />
      </div>

      <Content className="p-6 m-0 overflow-auto flex flex-col items-center font-display text-ink">
        {songData && chart && parsedMidi && (
          <div className="flex flex-col items-center min-w-max bg-paper rounded-[11px] p-10">
            <h1 className="my-0 mx-auto text-4xl text-ink font-semibold">
              {songData.name}
            </h1>
            <div className="ml-auto text-[15px] italic font-bold flex flex-col items-end text-ink">
              <div>Music by {songData.artist}</div>
              <div>Arranged by {songData.charter}</div>
            </div>
            <SheetMusic
              chart={chart}
              parsedMidi={parsedMidi}
              currentTime={currentPlayback}
              playheadStyle={playheadStyle}
              showBarNumbers={showBarNumbers}
              enableColors={enableColors}
              progressColoring={progressColoring}
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
  );
}
