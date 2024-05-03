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
  Voice,
} from 'vexflow';
import { Measure, MidiParser } from './parser';

export interface RenderData {
  stave: Stave;
  measure: Measure;
}

const STAVE_WIDTH = 600;
const STAVE_PER_ROW = 2;

const NOTE_COLOR_MAP: { [key: string]: string } = {
  'e/4': '#ff793f', // orange
  'f/4': '#ff793f', // orange
  'c/5': '#e74c3c', // red
  'g/5/x2': '#ffb142', // yellow
  'f/5/x2': '#2980b9', // blue
  'a/5/x2': '#27ae60', // green
  'e/5': '#ffb142', // yellow
  'd/5': '#2980b9', // blue
  'a/4': '#27ae60', // green
};

export function renderMusic(
  elementRef: React.RefObject<HTMLDivElement>,
  song: MidiParser,
  showBarNumbers: boolean = true,
  enableColors: boolean = false,
): RenderData[] {
  if (!elementRef.current) {
    return [];
  }

  const renderer = new Renderer(elementRef.current, Renderer.Backends.SVG);

  const context = renderer.getContext();
  const lineHeight = showBarNumbers ? 180 : 130;

  renderer.resize(
    STAVE_WIDTH * STAVE_PER_ROW + 10,
    Math.ceil(song.measures.length / STAVE_PER_ROW) * lineHeight + 50,
  );

  return song.measures.map((measure, index) => ({
    measure,
    stave: renderMeasure(
      context,
      measure,
      index,
      (index % STAVE_PER_ROW) * STAVE_WIDTH,
      Math.floor(index / STAVE_PER_ROW) * lineHeight,
      index === song.measures.length - 1,
      showBarNumbers,
      enableColors,
    ),
  }));
}

function renderMeasure(
  context: RenderContext,
  measure: Measure,
  index: number,
  xOffset: number,
  yOffset: number,
  endMeasure: boolean,
  showBarNumbers: boolean,
  enableColors: boolean,
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

  if (showBarNumbers) {
    stave.setText(`${index}`, ModifierPosition.ABOVE, {
      justification: TextJustification.LEFT,
    });
  }

  stave.setContext(context).draw();

  const tuplets: StaveNote[][] = [];
  let currentTuplet: StaveNote[] | null = null;

  const notes = measure.notes.map((note) => {
    const staveNote = new StaveNote({
      keys: note.notes,
      duration: note.duration,
      align_center: note.duration === 'wr',
    });

    if (enableColors) {
      staveNote.keys.forEach((n, idx) => {
        staveNote.setKeyStyle(idx, { fillStyle: NOTE_COLOR_MAP[n] });
      });
    }

    if (
      note.isTriplet &&
      (!currentTuplet || (currentTuplet && currentTuplet.length === 3))
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

  const voice = new Voice({
    num_beats: measure.timeSig[0],
    beat_value: measure.timeSig[1],
  })
    .setStrict(false)
    .addTickables(notes);

  const drawableTuplets = tuplets.map((tupletNotes) => new Tuplet(tupletNotes));

  const beams = Beam.generateBeams(notes, {
    flat_beams: true,
    stem_direction: -1,
  });

  new Formatter().joinVoices([voice]).format([voice], STAVE_WIDTH - 40);

  voice.draw(context, stave);

  beams.forEach((b) => {
    b.setContext(context).draw();
  });

  drawableTuplets.forEach((tuplet) => {
    tuplet.setContext(context).draw();
  });

  return stave;
}
