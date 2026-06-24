import { RefObject, useRef, useEffect } from 'react';
import { ParsedChart, RenderData } from '../../chart-parser/types';
import {
  MidiDevice,
  MidiMapping,
  MidiMessage,
  MidiMessageType,
} from '../../types';
import { secondsToTicks, ticksToSeconds } from '../views/utils';
import { HitHandler } from './useNoteDecoration';

const MIDI_MAPPING_TO_KEYS: Record<keyof MidiMapping, string[]> = {
  kick: ['f/4', 'e/4'],
  snare: ['c/5'],
  hihat: ['g/5'],
  tom1: ['e/5'],
  ride: ['f/5'],
  tom2: ['d/5'],
  crash: ['a/5'],
  tom3: ['a/4'],
};

function keyPrefix(key: string): string {
  const [pitch, octave] = key.split('/');

  return `${pitch}/${octave}`;
}

export interface HitDetectionResult {
  hitKeys: { current: Set<string> };
  incorrectHitCount: { current: number };
}

export function useHitDetection(
  currentTick: number | null,
  selectedDevice: MidiDevice | null,
  midiMapping: MidiMapping,
  renderData: RenderData[],
  chart: ParsedChart | null,
  onHitRef: RefObject<HitHandler | null>,
  isPlaying: boolean,
): HitDetectionResult {
  const hitKeysRef = useRef<Set<string>>(new Set());
  const incorrectHitCountRef = useRef<number>(0);
  const renderDataRef = useRef(renderData);
  const chartRef = useRef(chart);
  const currentTickRef = useRef(currentTick);
  const midiMappingRef = useRef(midiMapping);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    midiMappingRef.current = midiMapping;
  }, [midiMapping]);

  useEffect(() => {
    chartRef.current = chart;
  }, [chart]);

  useEffect(() => {
    const prev = currentTickRef.current;

    if (currentTick !== null && prev !== null && currentTick < prev) {
      for (const key of hitKeysRef.current) {
        if (parseInt(key) >= currentTick) {
          hitKeysRef.current.delete(key);
        }
      }

      incorrectHitCountRef.current = 0;
    }

    currentTickRef.current = currentTick;
  }, [currentTick]);

  useEffect(() => {
    renderDataRef.current = renderData;
    hitKeysRef.current.clear();
    incorrectHitCountRef.current = 0;
  }, [renderData]);

  useEffect(() => {
    if (!selectedDevice) {
      return undefined;
    }

    return window.electron.ipcRenderer.on<MidiMessage>(
      'listen-midi',
      ({ type, note, velocity }) => {
        if (
          type !== MidiMessageType.NoteOn ||
          velocity === 0 ||
          !isPlayingRef.current
        ) {
          return;
        }

        const mapping = midiMappingRef.current;
        const hitElements = (
          Object.keys(mapping) as (keyof MidiMapping)[]
        ).filter((key) => mapping[key]?.includes(note));

        if (hitElements.length === 0) {
          return;
        }

        const expectedPrefixes = new Set(
          hitElements.flatMap((el) => MIDI_MAPPING_TO_KEYS[el]),
        );
        const tick = currentTickRef.current;
        const chartData = chartRef.current;

        if (tick === null || chartData === null) {
          return;
        }

        const currentTimeS = ticksToSeconds(
          tick,
          chartData.resolution,
          chartData.tempos,
        );
        const toleranceTicks =
          secondsToTicks(
            currentTimeS + 0.1,
            chartData.resolution,
            chartData.tempos,
          ) - tick;
        let bestDist = Infinity;
        let bestNote: RenderData['renderedNotes'][number] | null = null;

        for (const { renderedNotes } of renderDataRef.current) {
          for (const rn of renderedNotes) {
            if (rn.note.isRest()) {
              continue;
            }

            const dist = Math.abs(rn.tick - tick);

            if (dist > toleranceTicks || dist >= bestDist) {
              continue;
            }

            const hasMatchingKey = rn.note
              .getKeys()
              .some((k) => expectedPrefixes.has(keyPrefix(k)));

            if (hasMatchingKey) {
              bestDist = dist;
              bestNote = rn;
            }
          }
        }

        if (bestNote) {
          const hit = bestNote;
          const newPrefixes = hit.note
            .getKeys()
            .map(keyPrefix)
            .filter(
              (p) =>
                expectedPrefixes.has(p) &&
                !hitKeysRef.current.has(`${hit.tick}:${p}`),
            );

          if (newPrefixes.length > 0) {
            newPrefixes.forEach((p) =>
              hitKeysRef.current.add(`${hit.tick}:${p}`),
            );
            onHitRef.current?.(hit.note, newPrefixes);
          } else {
            incorrectHitCountRef.current += 1;
          }
        } else {
          incorrectHitCountRef.current += 1;
        }
      },
    );
  }, [selectedDevice, onHitRef]);

  return { hitKeys: hitKeysRef, incorrectHitCount: incorrectHitCountRef };
}
