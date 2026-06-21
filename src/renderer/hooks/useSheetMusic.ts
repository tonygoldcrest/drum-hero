import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { App } from 'antd';
import { Difficulty, parseChartFile } from 'scan-chart';
import { last } from 'es-toolkit';
import { ChartParser } from '../../chart-parser/parser';
import { renderMusic } from '../../chart-parser/renderer';
import { ParsedChart, RenderData } from '../../chart-parser/types';

interface UseSheetMusicParams {
  fileData: Buffer | undefined;
  format: 'mid' | 'chart';
  fiveLaneDrums: boolean;
  proDrums: boolean;
  songId: string | undefined;
  difficulty: Difficulty;
  showBarNumbers: boolean;
  enableColors: boolean;
}

interface UseSheetMusicResult {
  chart: ParsedChart | null;
  parsedMidi: ChartParser | null;
  renderData: RenderData[];
  vexflowContainerRef: RefObject<HTMLDivElement | null>;
  difficulties: Difficulty[];
  activeDifficulty: Difficulty;
}

export function useSheetMusic({
  fileData,
  format,
  fiveLaneDrums,
  proDrums,
  songId,
  difficulty,
  showBarNumbers,
  enableColors,
}: UseSheetMusicParams): UseSheetMusicResult {
  const { notification } = App.useApp();
  const vexflowContainerRef = useRef<HTMLDivElement>(null);
  const [parsedMidi, setParsedMidi] = useState<ChartParser | null>(null);
  const [renderData, setRenderData] = useState<RenderData[]>([]);
  const lastParseKeyRef = useRef<string>('');
  const chart = useMemo(() => {
    if (!fileData) {
      return null;
    }

    return parseChartFile(new Uint8Array(fileData), format, {
      pro_drums: proDrums,
      five_lane_drums: fiveLaneDrums,
    });
  }, [fileData, format, proDrums, fiveLaneDrums]);
  const difficulties = useMemo<Difficulty[]>(() => {
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

  useEffect(() => {
    if (!chart || !songId) {
      setParsedMidi(null);

      return;
    }

    const key = `${activeDifficulty}:${songId}`;

    if (key === lastParseKeyRef.current) {
      return;
    }

    lastParseKeyRef.current = key;

    try {
      setParsedMidi(new ChartParser(chart, fiveLaneDrums, activeDifficulty));
    } catch {
      setParsedMidi(null);
      notification.error({
        message: 'Chart parse failed',
        description:
          "This song's chart could not be parsed and cannot be displayed.",
        placement: 'bottomRight',
      });
    }
  }, [chart, songId, fiveLaneDrums, activeDifficulty, notification]);

  useEffect(() => {
    if (!vexflowContainerRef.current || !parsedMidi) {
      return;
    }

    if (vexflowContainerRef.current.children.length > 0) {
      vexflowContainerRef.current.removeChild(
        vexflowContainerRef.current.children[0],
      );
    }

    setRenderData(
      renderMusic(
        vexflowContainerRef,
        parsedMidi,
        showBarNumbers,
        enableColors,
      ),
    );
  }, [parsedMidi, showBarNumbers, enableColors]);

  return {
    chart,
    parsedMidi,
    renderData,
    vexflowContainerRef,
    difficulties,
    activeDifficulty,
  };
}
