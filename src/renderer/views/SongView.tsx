import { useEffect, useMemo, useState } from 'react';
import { Button, Layout, Spin } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { useNavigate, useParams } from 'react-router-dom';
import { Playback } from '../components/Playback';
import { SettingsButton } from '../components/SettingsButton';
import { SheetMusic } from '../components/SheetMusic/SheetMusic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { useSongLoader } from '../hooks/useSongLoader';
import { useGameEngine } from '../hooks/useGameEngine';
import { useVolumeControls } from '../hooks/useVolumeControls';
import { calculateAccuracy } from './utils';
import { useSheetMusic } from '../hooks/useSheetMusic';
import { useInputControls } from '../hooks/useInputControls';
import { ScoreModal } from '../components/ScoreModal';
import { CountIn } from '../components/CountIn';
import { ScoreData } from '../../types';

export function SongView() {
  const {
    difficulty,
    playheadStyle,
    enableColors,
    showBarNumbers,
    showTempo,
    countIn,
    inputMapping,
  } = useApp();
  const [scoreData, setScoreData] = useState<ScoreData>();
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { fileData, format, songData, trackData } = useSongLoader(id);
  const { chart, parsedMidi, renderData, vexflowContainerRef } = useSheetMusic({
    fileData,
    format,
    fiveLaneDrums: songData?.five_lane_drums === 'True',
    proDrums: songData?.pro_drums === 'True',
    songId: songData?.id,
    difficulty,
    showBarNumbers,
    enableColors,
    showTempo,
  });
  const measures = useMemo(
    () => renderData.map((rd) => rd.measure),
    [renderData],
  );
  const delaySeconds = (Number(songData?.delay) || 0) / 1000;
  const {
    engine,
    isReady,
    duration,
    timeStore,
    isPlaying,
    isCounting,
    isEnded,
    countInBeat,
    countInBeatMs,
    play,
    playFromTick,
    pause,
    cancel,
    seekSeconds,
    setStemVolume,
  } = useGameEngine({
    trackData,
    isDev,
    chart,
    measures,
    renderData,
    delaySeconds,
    countInEnabled: countIn,
    playheadStyle,
    mapping: inputMapping,
    onEnded: (score) => {
      setScoreData(score);
      setIsScoreModalOpen(true);

      const previousScore = songData?.scoreData?.[difficulty];
      const isHighScore =
        !previousScore ||
        calculateAccuracy(score) > calculateAccuracy(previousScore);
      const isAttempt = (score.hitNotes ?? 0) > 0;

      if (id && isHighScore && isAttempt) {
        window.electron.ipcRenderer.sendMessage('update-song', {
          id,
          scoreData: { [difficulty]: score },
        });
      }
    },
  });
  const { volumeSliders } = useVolumeControls(
    trackData,
    setStemVolume,
    isReady,
  );
  const audioLoading = trackData.length > 0 && !isReady;
  const isLoading = !songData || audioLoading;
  const onNextSong = () => {
    setIsScoreModalOpen(false);
    navigate('/');
  };
  const onRetry = () => {
    setIsScoreModalOpen(false);
    playFromTick(0);
  };

  useInputControls(
    inputMapping,
    {
      tom3: () => {
        if (isReady && !isPlaying && !isEnded && !isCounting) {
          play();

          return;
        }

        if (isEnded && isScoreModalOpen) {
          onNextSong();
        }
      },
      pause: () => {
        if (isCounting) {
          cancel();

          return;
        }

        if (!isEnded && isPlaying) {
          pause();
        }
      },
      snare: () => {
        if (!isPlaying && !isEnded) {
          cancel();
          navigate('/');

          return;
        }

        if (isEnded && isScoreModalOpen) {
          onRetry();
        }
      },
    },
    !isLoading,
  );

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

  return (
    <Layout className="h-full pointer-events-auto">
      <ScoreModal
        isOpen={isScoreModalOpen}
        onNextSong={onNextSong}
        onRetry={onRetry}
        songData={songData}
        difficulty={difficulty}
        scoreData={scoreData}
      />
      <div
        className="flex items-center p-4 gap-5"
        style={{ background: 'var(--gradient-header)' }}
      >
        <Button
          icon={<FontAwesomeIcon icon={faArrowLeft} />}
          data-testid="back-button"
          onClick={() => {
            cancel();
            pause();
            navigate('/');
          }}
          size="large"
        />

        <Button
          type="primary"
          icon={<FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />}
          loading={audioLoading}
          data-testid="play-toggle"
          onClick={() => {
            if (isCounting) {
              cancel();

              return;
            }

            if (isPlaying) {
              pause();

              return;
            }

            play();
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
            <div className="capitalize">{difficulty}</div>
          </div>
        </div>

        <Playback
          timeStore={timeStore}
          disabled={!isReady}
          duration={duration}
          isDev={isDev}
          onChange={(value) => {
            if (!isReady) {
              return;
            }

            seekSeconds((value / 100) * duration);
          }}
        />
        <SettingsButton page="song-view" volumeSliders={volumeSliders} />
      </div>

      <div className="relative grow flex min-h-0">
        <Content className="grow p-6 m-0 overflow-auto flex flex-col items-center font-display text-ink">
          {songData && chart && parsedMidi && (
            <SheetMusic
              engine={engine}
              renderData={renderData}
              songData={songData}
              isDev={isDev}
              vexflowContainerRef={vexflowContainerRef}
              onSelectMeasure={(measure) => playFromTick(measure.startTick)}
            />
          )}
        </Content>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 backdrop-blur-xs">
            <Spin />
          </div>
        )}
        <CountIn count={countInBeat} beatMs={countInBeatMs} />
      </div>
    </Layout>
  );
}
