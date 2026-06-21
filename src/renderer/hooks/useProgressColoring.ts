import { useRef, useEffect } from 'react';
import { RenderData } from '../../chart-parser/types';
import { StaveNote } from 'vexflow';
import { HIT_NOTE_COLOR, MISSED_NOTE_COLOR } from '../views/utils';
import { PlayheadStyle } from '../types';
import { ActiveNoteInfo } from './types';

function keyPrefix(key: string): string {
  const [pitch, octave] = key.split('/');

  return `${pitch}/${octave}`;
}

function forEachNoteHead(
  note: StaveNote,
  cb: (el: SVGElement, keyPrefix: string) => void,
) {
  note.getKeys().forEach((key, i) => {
    const el = note.noteHeads[i]?.getSVGElement();

    if (el) {
      cb(el, keyPrefix(key));
    }
  });
}

export function useProgressColoring(
  activeNote: ActiveNoteInfo | null,
  playheadStyle: PlayheadStyle,
  renderData: RenderData[],
  enabled: boolean,
  hitKeys: { current: Set<string> },
) {
  const decolorizedElsRef = useRef<Set<SVGElement>>(new Set());
  const prevKeyRef = useRef<string | null>(null);
  const prevPosRef = useRef<{ measureIdx: number; noteIdx: number } | null>(
    null,
  );

  useEffect(() => {
    decolorizedElsRef.current.forEach((el) => {
      (el as SVGGraphicsElement).style.fill = '';
    });
    decolorizedElsRef.current.clear();
    prevKeyRef.current = null;
    prevPosRef.current = null;
  }, [renderData]);
  useEffect(() => {
    if (activeNote?.key === prevKeyRef.current) {
      return;
    }

    const colorNote = (el: SVGElement, tick: number, key: string) => {
      (el as SVGGraphicsElement).style.fill = hitKeys.current.has(
        `${tick}:${key}`,
      )
        ? HIT_NOTE_COLOR
        : MISSED_NOTE_COLOR;
      decolorizedElsRef.current.add(el);
    };
    const clearAll = () => {
      decolorizedElsRef.current.forEach((el) => {
        (el as SVGGraphicsElement).style.fill = '';
      });
      decolorizedElsRef.current.clear();
    };

    if (!activeNote || playheadStyle === 'None' || !enabled) {
      clearAll();
      prevKeyRef.current = null;
      prevPosRef.current = null;

      return;
    }

    const { noteIdx, measureIdx, renderedNotes: curRenderedNotes } = activeNote;
    const prev = prevPosRef.current;
    const isBackward =
      prev !== null &&
      (measureIdx < prev.measureIdx ||
        (measureIdx === prev.measureIdx && noteIdx < prev.noteIdx));

    if (isBackward) {
      clearAll();

      for (let m = 0; m < measureIdx; m++) {
        renderData[m]?.renderedNotes.forEach(({ note, tick }) =>
          forEachNoteHead(note, (el, key) => colorNote(el, tick, key)),
        );
      }

      for (let i = 0; i < noteIdx; i++) {
        const { note, tick } = curRenderedNotes[i];

        forEachNoteHead(note, (el, key) => colorNote(el, tick, key));
      }
    } else {
      const fromMeasure = prev?.measureIdx ?? 0;
      const fromNote = prev?.noteIdx ?? 0;

      if (fromMeasure === measureIdx) {
        for (let i = fromNote; i < noteIdx; i++) {
          const { note, tick } = curRenderedNotes[i];

          forEachNoteHead(note, (el, key) => colorNote(el, tick, key));
        }
      } else {
        const prevMeasureNotes = renderData[fromMeasure]?.renderedNotes ?? [];

        for (let i = fromNote; i < prevMeasureNotes.length; i++) {
          const { note, tick } = prevMeasureNotes[i];

          forEachNoteHead(note, (el, key) => colorNote(el, tick, key));
        }

        for (let m = fromMeasure + 1; m < measureIdx; m++) {
          renderData[m]?.renderedNotes.forEach(({ note, tick }) =>
            forEachNoteHead(note, (el, key) => colorNote(el, tick, key)),
          );
        }

        for (let i = 0; i < noteIdx; i++) {
          const { note, tick } = curRenderedNotes[i];

          forEachNoteHead(note, (el, key) => colorNote(el, tick, key));
        }
      }
    }

    prevKeyRef.current = activeNote.key;
    prevPosRef.current = { measureIdx, noteIdx };
  }, [activeNote, playheadStyle, renderData, enabled, hitKeys]);
}
