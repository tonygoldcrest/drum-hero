import React from 'react';
import {
  RenderContext,
  Renderer,
  Stave,
  StaveNote,
  TextJustification,
  Formatter,
  ModifierPosition,
  Beam,
  Dot,
  Barline,
  Tuplet,
} from 'vexflow';
import { Measure, Song } from '../midi-parser/song';

const STAVE_WIDTH = 400;
const STAVE_PER_ROW = 3;
const LINE_HEIGHT = 150;

export function renderMusic(
  elementRef: React.RefObject<HTMLDivElement>,
  song: Song,
) {
  if (!elementRef.current) {
    return;
  }

  const renderer = new Renderer(elementRef.current, Renderer.Backends.SVG);

  const context = renderer.getContext();

  renderer.resize(
    STAVE_WIDTH * STAVE_PER_ROW + 50,
    Math.ceil(song.measures.length / STAVE_PER_ROW) * LINE_HEIGHT + 50,
  );

  song.measures.forEach((measure, index) => {
    renderMeasure(
      context,
      measure,
      index,
      (index % STAVE_PER_ROW) * STAVE_WIDTH,
      Math.floor(index / STAVE_PER_ROW) * LINE_HEIGHT,
      index === song.measures.length - 1,
    );
  });
}

function renderMeasure(
  context: RenderContext,
  measure: Measure,
  index: number,
  xOffset: number,
  yOffset: number,
  endMeasure: boolean,
) {
  const stave = new Stave(xOffset, yOffset, STAVE_WIDTH);

  if (endMeasure) {
    stave.setEndBarType(Barline.type.END);
  }
  if (measure.hasClef) {
    stave.addClef('percussion');
  }
  if (measure.sigChange) {
    stave.addTimeSignature(`${measure.timeSig[0]}/${measure.timeSig[1]}`);
  }

  stave.setText(`${index}`, ModifierPosition.ABOVE, {
    justification: TextJustification.LEFT,
  });

  stave.setContext(context).draw();

  const tuplets: StaveNote[][] = [];
  let currentTuplet: StaveNote[] | null = null;

  const notes = measure.notes.map((note) => {
    const staveNote = new StaveNote({
      keys: note.notes,
      duration: note.duration,
      align_center: note.duration === 'wr',
    });

    if (
      (note.isTriplet && !currentTuplet) ||
      (note.isTriplet && currentTuplet && currentTuplet.length === 3)
    ) {
      currentTuplet = [staveNote];
      tuplets.push(currentTuplet);
    } else if (note.isTriplet && currentTuplet) {
      currentTuplet.push(staveNote);
    } else if (!note.isTriplet && currentTuplet) {
      currentTuplet = null;
    }

    if (note.dotted) {
      Dot.buildAndAttach([staveNote], {
        all: true,
      });
    }
    return staveNote;
  });

  const drawableTuplets = tuplets.map((tupletNotes) => new Tuplet(tupletNotes));

  const beams = Beam.generateBeams(notes, {
    flat_beams: true,
    stem_direction: -1,
  });

  Formatter.FormatAndDraw(context, stave, notes);

  drawableTuplets.forEach((tuplet) => {
    tuplet.setContext(context).draw();
  });

  beams.forEach((b) => {
    b.setContext(context).draw();
  });

  return stave;
}
