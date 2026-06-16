import { useEffect, useRef } from 'react';
import { RenderData, RenderedNote } from '../../../chart-parser/types';
import { PlayheadStyle } from '../../views/SongView/types';
import { getNoteSvg } from './utils';

export interface ActiveNoteInfo {
  key: string;
  noteHeadEls: SVGElement[];
  noteIdx: number;
  measureIdx: number;
  renderedNotes: RenderedNote[];
}

const applyTransform = (el: SVGElement, transform: string) => {
  const g = el as SVGGraphicsElement;
  g.style.transformBox = 'fill-box';
  g.style.transformOrigin = 'center';
  g.style.transition = 'transform 0.08s ease-out';
  g.style.transform = transform;
};

export function useActiveNoteScale(
  activeNote: ActiveNoteInfo | null,
  renderData: RenderData[],
) {
  const prevRef = useRef<ActiveNoteInfo | null>(null);

  useEffect(() => {
    const prev = prevRef.current;

    if (!activeNote) {
      if (prev) {
        prev.noteHeadEls.forEach((el) => applyTransform(el, ''));
        prevRef.current = null;
      }
      return;
    }

    if (prev?.key === activeNote.key) {
      return;
    }

    if (prev) {
      prev.noteHeadEls.forEach((el) => applyTransform(el, ''));
    }

    activeNote.noteHeadEls.forEach((el) => applyTransform(el, 'scale(1.5)'));
    prevRef.current = activeNote;
  }, [activeNote]);

  useEffect(() => {
    prevRef.current = null;
  }, [renderData]);
}

export function useProgressColoring(
  activeNote: ActiveNoteInfo | null,
  playheadStyle: PlayheadStyle,
  renderData: RenderData[],
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

    if (!activeNote || playheadStyle === 'None') {
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
  }, [activeNote, playheadStyle, renderData]);

  useEffect(() => {
    decolorizedElsRef.current.forEach((el) => {
      (el as SVGGraphicsElement).style.filter = '';
    });
    decolorizedElsRef.current.clear();
    prevKeyRef.current = null;
    prevPosRef.current = null;
  }, [renderData]);
}
