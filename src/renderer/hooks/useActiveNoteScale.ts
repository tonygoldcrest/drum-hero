import { useRef, useEffect } from 'react';
import { RenderData } from '../../chart-parser/types';
import { ActiveNoteInfo } from './types';

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
    prevRef.current = null;
  }, [renderData]);
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
}
