import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Layout, Spin } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { useNavigate, useParams } from 'react-router-dom';
import { Playback } from '../components/Playback';
import { SettingsButton } from '../components/SettingsButton';
import { SongSheet } from '../components/SongSheet';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { useApp } from '../context/AppContext';
import { Difficulty } from 'scan-chart';
import { useSongLoader } from '../hooks/useSongLoader';
import { usePlayback } from '../hooks/usePlayback';
import { useVolumeControls } from '../hooks/useVolumeControls';
import { calculateAccuracy } from './utils';
import { useSheetMusic } from '../hooks/useSheetMusic';
import { HitDetectionResult } from '../hooks/useHitDetection';
import { useDrumControls } from '../hooks/useDrumControls';
import { ScoreModal } from '../components/ScoreModal';
import { CountIn } from '../components/CountIn';
import { ScoreData } from '../../types';

export function SongView() {
  const {
    playheadStyle,
    enableColors,
    showBarNumbers,
    showTempo,
    progressColoring,
    countIn,
    selectedDevice,
    midiMapping,
  } = useApp();
  const [difficulty, setDifficulty] = useState<Difficulty>('expert');
  const [scoreData, setScoreData] = useState<ScoreData>();
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { fileData, format, songData, trackData } = useSongLoader(id);
  const scoreRef = useRef<HitDetectionResult | undefined>(undefined);
  const {
    chart,
    parsedMidi,
    renderData,
    vexflowContainerRef,
    difficulties,
    activeDifficulty,
  } = useSheetMusic({
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
    audioPlayer,
    timeStore,
    isPlaying,
    isCounting,
    isStarted,
    isEnded,
    countInBeat,
    countInBeatMs,
    play,
    playFromTick,
    pause,
    cancel,
    seekSeconds,
  } = usePlayback({
    trackData,
    chart,
    measures,
    delaySeconds,
    countInEnabled: countIn,
    isDev,
    onEnded: () => {
      const score = {
        hitNotes: scoreRef.current?.hitKeys.current.size ?? 0,
        falseHits: scoreRef.current?.incorrectHitCount.current ?? 0,
        totalNotes: renderData
          .flatMap((rd) => rd.measure.notes)
          .filter((n) => !n.isRest)
          .reduce((sum, n) => sum + n.notes.length, 0),
      };

      setScoreData(score);
      setIsScoreModalOpen(true);

      const previousScore = songData?.scoreData?.[activeDifficulty];
      const isHighScore =
        !previousScore ||
        calculateAccuracy(score) > calculateAccuracy(previousScore);

      if (id && isHighScore) {
        window.electron.ipcRenderer.sendMessage('update-song', {
          id,
          scoreData: { [activeDifficulty]: score },
        });
      }
    },
  });
  const { volumeSliders } = useVolumeControls(trackData, audioPlayer);
  const audioLoading = trackData.length > 0 && !audioPlayer;
  const isLoading = !songData || audioLoading;
  const onNextSong = () => {
    setIsScoreModalOpen(false);
    navigate('/');
  };
  const onRetry = () => {
    setIsScoreModalOpen(false);
    playFromTick(0);
  };

  useDrumControls(
    selectedDevice,
    midiMapping,
    {
      tom3: () => {
        if (audioPlayer && !isPlaying && !isEnded && !isCounting) {
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
        difficulty={activeDifficulty}
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
            <div>{activeDifficulty}</div>
          </div>
        </div>

        <Playback
          timeStore={timeStore}
          disabled={!audioPlayer}
          duration={audioPlayer?.duration ?? 0}
          isDev={isDev}
          onChange={(value) => {
            if (!audioPlayer) {
              return;
            }

            seekSeconds((value / 100) * audioPlayer.duration);
          }}
        />
        <SettingsButton
          page="song-view"
          volumeSliders={volumeSliders}
          difficulties={difficulties}
          onChangeDifficulty={setDifficulty}
          difficulty={activeDifficulty}
          difficultyDisabled={isStarted}
        />
      </div>

      <div className="relative grow flex min-h-0">
        <Content className="grow p-6 m-0 overflow-auto flex flex-col items-center font-display text-ink">
          {songData && chart && parsedMidi && (
            <SongSheet
              chart={chart}
              renderData={renderData}
              songData={songData}
              timeStore={timeStore}
              delaySeconds={delaySeconds}
              playheadStyle={playheadStyle}
              progressColoring={progressColoring}
              selectedDevice={selectedDevice}
              midiMapping={midiMapping}
              isPlaying={isPlaying}
              isDev={isDev}
              vexflowContainerRef={vexflowContainerRef}
              onSelectMeasure={(measure) => playFromTick(measure.startTick)}
              scoreRef={scoreRef}
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
