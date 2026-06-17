import { useRef, useEffect } from 'react';
import { RenderData } from '../../chart-parser/types';
import { getNoteSvg } from '../components/SheetMusic/utils';
import { PlayheadStyle } from '../types';
import { ActiveNoteInfo } from './types';

export function useProgressColoring(
  activeNote: ActiveNoteInfo | null,
  playheadStyle: PlayheadStyle,
  renderData: RenderData[],
  enabled: boolean,
) {
  const decolorizedElsRef = useRef<Set<SVGElement>>(new Set());
  const prevKeyRef = useRef<string | null>(null);
  const prevPosRef = useRef<{ measureIdx: number; noteIdx: number } | null>(
    null,
  );

  useEffect(() => {
    if (activeNote?.key === prevKeyRef.current) {
      return;
    }

    const grey = (el: SVGElement) => {
      (el as SVGGraphicsElement).style.filter = 'grayscale(1) opacity(0.4)';
      decolorizedElsRef.current.add(el);
    };

    const clearAll = () => {
      decolorizedElsRef.current.forEach((el) => {
        (el as SVGGraphicsElement).style.filter = '';
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
        renderData[m]?.renderedNotes.forEach(({ note }) =>
          getNoteSvg(note).forEach(grey),
        );
      }

      for (let i = 0; i < noteIdx; i++) {
        getNoteSvg(curRenderedNotes[i].note).forEach(grey);
      }
    } else {
      const fromMeasure = prev?.measureIdx ?? 0;
      const fromNote = prev?.noteIdx ?? 0;

      if (fromMeasure === measureIdx) {
        for (let i = fromNote; i < noteIdx; i++) {
          getNoteSvg(curRenderedNotes[i].note).forEach(grey);
        }
      } else {
        const prevMeasureNotes = renderData[fromMeasure]?.renderedNotes ?? [];
        for (let i = fromNote; i < prevMeasureNotes.length; i++) {
          getNoteSvg(prevMeasureNotes[i].note).forEach(grey);
        }
        for (let m = fromMeasure + 1; m < measureIdx; m++) {
          renderData[m]?.renderedNotes.forEach(({ note }) =>
            getNoteSvg(note).forEach(grey),
          );
        }
        for (let i = 0; i < noteIdx; i++) {
          getNoteSvg(curRenderedNotes[i].note).forEach(grey);
        }
      }
    }

    prevKeyRef.current = activeNote.key;
    prevPosRef.current = { measureIdx, noteIdx };
  }, [activeNote, playheadStyle, renderData, enabled]);

  useEffect(() => {
    decolorizedElsRef.current.forEach((el) => {
      (el as SVGGraphicsElement).style.filter = '';
    });
    decolorizedElsRef.current.clear();
    prevKeyRef.current = null;
    prevPosRef.current = null;
  }, [renderData]);
}
