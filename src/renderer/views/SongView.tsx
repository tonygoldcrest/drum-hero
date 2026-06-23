import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Layout } from 'antd';
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
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useVolumeControls } from '../hooks/useVolumeControls';
import { calculateAccuracy, ticksToSeconds } from './utils';
import { useSheetMusic } from '../hooks/useSheetMusic';
import { HitDetectionResult } from '../hooks/useHitDetection';
import { ScoreModal } from '../components/ScoreModal';
import { ScoreData } from '../../types';
import { Measure } from '../../chart-parser/types';

export function SongView() {
  const {
    playheadStyle,
    enableColors,
    showBarNumbers,
    progressColoring,
    selectedDevice,
    midiMapping,
  } = useApp();
  const [difficulty, setDifficulty] = useState<Difficulty>('expert');
  const [scoreData, setScoreData] = useState<ScoreData>();
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isDev, setIsDev] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();
  const { fileData, format, songData, trackData } = useSongLoader(id);
  const scoreRef = useRef<HitDetectionResult | undefined>(undefined);
  const { audioPlayer, isPlaying, setIsPlaying, timeStore } = useAudioPlayer(
    trackData,
    isDev,
    () => {
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
  );
  const { volumeSliders } = useVolumeControls(trackData, audioPlayer);
  const audioLoading = trackData.length > 0 && !audioPlayer;
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
  });
  const delaySeconds = (Number(songData?.delay) || 0) / 1000;

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

  const onSelectMeasure = useCallback(
    (measure: Measure) => {
      if (!chart || !audioPlayer) {
        return;
      }

      audioPlayer.start(
        ticksToSeconds(measure.startTick, chart.resolution, chart.tempos) +
          delaySeconds,
      );
      setIsPlaying(true);
    },
    [chart, audioPlayer, delaySeconds, setIsPlaying],
  );
  const onNextSong = useCallback(() => {
    setIsScoreModalOpen(false);
    navigate('/');
  }, [navigate]);
  const onRetry = useCallback(() => {
    setIsScoreModalOpen(false);
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
            setIsPlaying(false);
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
          timeStore={timeStore}
          disabled={!audioPlayer}
          duration={audioPlayer?.duration ?? 0}
          isDev={isDev}
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
            onSelectMeasure={onSelectMeasure}
            scoreRef={scoreRef}
          />
        )}
      </Content>
    </Layout>
  );
}
