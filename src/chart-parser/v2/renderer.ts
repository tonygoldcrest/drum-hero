import React from 'react';
import {
  RenderContext,
  Renderer,
  Stave,
  StaveNote,
  TextJustification,
  Formatter,
  Fraction,
  ModifierPosition,
  Beam,
  Dot,
  Barline,
  Tuplet,
  Voice,
  GraceNote,
  GraceNoteGroup,
} from 'vexflow';
import { ChartParser } from './parser';
import { Measure, RenderData } from './types';

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

const STEM_DIRECTION = -1;
const REST_KEY = 'b/4';

export function renderMusic(
  elementRef: React.RefObject<HTMLDivElement>,
  song: ChartParser,
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

function buildVoice(measure: Measure, enableColors: boolean) {
  const tupletGroups = new Map<number, StaveNote[]>();

  const staveNotes = measure.notes.map((note) => {
    const isMeasureRest = note.isRest && note.duration === 'w';
    const staveNote = new StaveNote({
      keys: note.isRest ? [REST_KEY] : note.notes,
      duration: `${note.duration}${'d'.repeat(note.dots)}${
        note.isRest ? 'r' : ''
      }`,
      align_center: isMeasureRest,
      stem_direction: STEM_DIRECTION,
    });

    if (note.dots > 0) {
      Dot.buildAndAttach([staveNote], {
        all: true,
      });
    }

    if (note.graceNotes?.length) {
      const graceNotes = note.graceNotes.map(
        (keys) =>
          new GraceNote({
            keys,
            duration: '8',
            slash: true,
            stem_direction: STEM_DIRECTION,
          }),
      );
      const graceGroup = new GraceNoteGroup(graceNotes, false);
      if (graceNotes.length > 1) {
        graceGroup.beamNotes();
      }
      staveNote.addModifier(graceGroup, 0);
    }

    if (enableColors && !note.isRest) {
      staveNote.keys.forEach((key, keyIndex) => {
        staveNote.setKeyStyle(keyIndex, { fillStyle: NOTE_COLOR_MAP[key] });
      });
    }

    if (note.tupletId !== undefined) {
      const group = tupletGroups.get(note.tupletId) ?? [];
      group.push(staveNote);
      tupletGroups.set(note.tupletId, group);
    }

    return staveNote;
  });

  const tuplets = measure.tuplets
    .filter((meta) => (tupletGroups.get(meta.id)?.length ?? 0) > 1)
    .map(
      (meta) =>
        new Tuplet(tupletGroups.get(meta.id) as StaveNote[], {
          num_notes: meta.numNotes,
          notes_occupied: meta.notesOccupied,
          ratioed: false,
          location: STEM_DIRECTION,
        }),
    );

  const voice = new Voice({
    num_beats: measure.timeSig[0],
    beat_value: measure.timeSig[1],
  })
    .setStrict(false)
    .addTickables(staveNotes);

  const beams = Beam.generateBeams(staveNotes, {
    flat_beams: true,
    stem_direction: STEM_DIRECTION,
    groups: measure.isCompound
      ? [new Fraction(3, measure.timeSig[1])]
      : undefined,
  });

  return { voice, beams, tuplets };
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

  const { voice, beams, tuplets } = buildVoice(measure, enableColors);

  new Formatter().joinVoices([voice]).format([voice], STAVE_WIDTH - 40);

  voice.draw(context, stave);

  beams.forEach((beam) => {
    beam.setContext(context).draw();
  });

  tuplets.forEach((tuplet) => {
    tuplet.setContext(context).draw();
  });

  return stave;
}
