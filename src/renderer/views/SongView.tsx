import { useEffect, useMemo, useState } from 'react';
import { Button, Layout } from 'antd';
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
import { Difficulty } from 'scan-chart';
import { useSongLoader } from '../hooks/useSongLoader';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useVolumeControls } from '../hooks/useVolumeControls';
import { secondsToTicks, ticksToSeconds } from './utils';
import { useSheetMusic } from '../hooks/useSheetMusic';
import { usePlayhead } from '../hooks/usePlayhead';
import { useActiveNoteScale } from '../hooks/useActiveNoteScale';
import { useHitDetection } from '../hooks/useHitDetection';
import { useProgressColoring } from '../hooks/useProgressColoring';
import { ScoreModal } from '../components/ScoreModal';
import { ScoreData } from '../../types';

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
  const { audioPlayer, isPlaying, setIsPlaying, currentTime } = useAudioPlayer(
    trackData,
    isDev,
    () => {
      const score = {
        hitNotes: hitKeys.current.size,
        falseHits: incorrectHitCount.current,
        totalNotes: renderData
          .flatMap((rd) => rd.measure.notes)
          .filter((n) => !n.isRest)
          .reduce((sum, n) => sum + n.notes.length, 0),
      };

      setScoreData(score);
      setIsScoreModalOpen(true);

      if (id) {
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
  const chartTime = currentTime - delaySeconds;
  const currentTick = useMemo(
    () =>
      chart ? secondsToTicks(chartTime, chart.resolution, chart.tempos) : null,
    [chartTime, chart],
  );
  const {
    highlightedMeasureIndex,
    cursorPosition,
    activeNoteInfo,
    highlightsRef,
  } = usePlayhead({
    chart,
    currentTime: chartTime,
    currentTick,
    renderData,
    playheadStyle,
  });
  const { hitKeys, incorrectHitCount } = useHitDetection(
    currentTick,
    selectedDevice,
    midiMapping,
    renderData,
    chart,
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

  useActiveNoteScale(activeNoteInfo, renderData);

  useProgressColoring(
    activeNoteInfo,
    playheadStyle,
    renderData,
    progressColoring,
    hitKeys,
  );

  return (
    <Layout className="h-full pointer-events-auto">
      <ScoreModal
        isOpen={isScoreModalOpen}
        onNextSong={() => {
          setIsScoreModalOpen(false);
          navigate('/');
        }}
        onRetry={() => {
          setIsScoreModalOpen(false);
        }}
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
          currentTime={currentTime}
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
          <SheetMusic
            songData={songData}
            renderData={renderData}
            vexflowContainerRef={vexflowContainerRef}
            highlightsRef={highlightsRef}
            highlightedMeasureIndex={highlightedMeasureIndex}
            cursorPosition={cursorPosition}
            playheadStyle={playheadStyle}
            isDev={isDev}
            onSelectMeasure={(measure) => {
              if (!chart || !audioPlayer) {
                return;
              }

              audioPlayer.start(
                ticksToSeconds(
                  measure.startTick,
                  chart.resolution,
                  chart.tempos,
                ) + delaySeconds,
              );
              setIsPlaying(true);
            }}
          />
        )}
      </Content>
    </Layout>
  );
}
