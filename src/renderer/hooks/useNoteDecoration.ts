import { RefObject, useCallback, useEffect, useRef } from 'react';
import { StaveNote } from 'vexflow';
import { RenderData } from '../../chart-parser/types';
import { HIT_NOTE_COLOR, MISSED_NOTE_COLOR } from '../views/utils';
import { PlayheadStyle } from '../types';
import { ActiveNoteInfo } from './types';

export type HitHandler = (note: StaveNote, prefixes: string[]) => void;

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

function applyScale(el: SVGElement, transform: string) {
  const g = el as SVGGraphicsElement;

  g.style.transformBox = 'fill-box';
  g.style.transformOrigin = 'center';
  g.style.transition = 'transform 0.08s ease-out';
  g.style.transform = transform;
}

export function useNoteDecoration(
  activeNote: ActiveNoteInfo | null,
  playheadStyle: PlayheadStyle,
  renderData: RenderData[],
  enabled: boolean,
  hitKeys: { current: Set<string> },
  onHitRef: RefObject<HitHandler | null>,
) {
  const filledElsRef = useRef<Set<SVGElement>>(new Set());
  const prevKeyRef = useRef<string | null>(null);
  const prevPosRef = useRef<{ measureIdx: number; noteIdx: number } | null>(
    null,
  );
  const scaledNoteRef = useRef<ActiveNoteInfo | null>(null);
  const enabledRef = useRef(enabled);
  const playheadStyleRef = useRef(playheadStyle);

  enabledRef.current = enabled;
  playheadStyleRef.current = playheadStyle;

  useEffect(() => {
    filledElsRef.current.clear();
    prevKeyRef.current = null;
    prevPosRef.current = null;
    scaledNoteRef.current = null;
  }, [renderData]);

  useEffect(() => {
    const prev = scaledNoteRef.current;

    if (!activeNote) {
      if (prev) {
        prev.noteHeadEls.forEach((el) => applyScale(el, ''));
        scaledNoteRef.current = null;
      }

      return;
    }

    if (prev?.key === activeNote.key) {
      return;
    }

    if (prev) {
      prev.noteHeadEls.forEach((el) => applyScale(el, ''));
    }

    activeNote.noteHeadEls.forEach((el) => applyScale(el, 'scale(1.5)'));
    scaledNoteRef.current = activeNote;
  }, [activeNote]);

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
      filledElsRef.current.add(el);
    };
    const clearAll = () => {
      filledElsRef.current.forEach((el) => {
        (el as SVGGraphicsElement).style.fill = '';
      });
      filledElsRef.current.clear();
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

  const handleHit = useCallback<HitHandler>((note, prefixes) => {
    if (!enabledRef.current || playheadStyleRef.current === 'None') {
      return;
    }

    note.getKeys().forEach((key, i) => {
      if (!prefixes.includes(keyPrefix(key))) {
        return;
      }

      const el = note.noteHeads[i]?.getSVGElement();

      if (el) {
        (el as SVGGraphicsElement).style.fill = HIT_NOTE_COLOR;
        filledElsRef.current.add(el);
      }
    });
  }, []);

  useEffect(() => {
    onHitRef.current = handleHit;

    return () => {
      onHitRef.current = null;
    };
  }, [handleHit, onHitRef]);
}
