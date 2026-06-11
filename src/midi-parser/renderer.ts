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
} from 'vexflow';
import { Measure, MeasureVoice, MidiParser, VoiceId } from './parser';

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

// Hands take the upper voice (stems up), feet the lower one (stems down).
// Rests of each voice sit away from the middle line so the voices don't
// collide.
const STEM_DIRECTION: Record<VoiceId, number> = { hands: 1, feet: -1 };
const REST_KEY: Record<VoiceId, string> = { hands: 'b/4', feet: 'd/4' };

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

function buildVoice(
  measureVoice: MeasureVoice,
  measure: Measure,
  enableColors: boolean,
) {
  const stemDirection = STEM_DIRECTION[measureVoice.id];
  const tupletGroups = new Map<number, StaveNote[]>();

  const staveNotes = measureVoice.notes.map((note) => {
    const isMeasureRest = note.isRest && note.duration === 'w';
    const staveNote = new StaveNote({
      keys: note.isRest ? [REST_KEY[measureVoice.id]] : note.notes,
      duration: `${note.duration}${'d'.repeat(note.dots)}${
        note.isRest ? 'r' : ''
      }`,
      align_center: isMeasureRest,
      stem_direction: stemDirection,
    });

    if (note.dots > 0) {
      Dot.buildAndAttach([staveNote], {
        all: true,
      });
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

  // Tuplets scale note ticks, so they must exist before beaming/formatting.
  const tuplets = measureVoice.tuplets
    .filter((meta) => (tupletGroups.get(meta.id)?.length ?? 0) > 1)
    .map(
      (meta) =>
        new Tuplet(tupletGroups.get(meta.id) as StaveNote[], {
          num_notes: meta.numNotes,
          notes_occupied: meta.notesOccupied,
          location: stemDirection,
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
    stem_direction: stemDirection,
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

  const voicesData = measure.voices.map((measureVoice) =>
    buildVoice(measureVoice, measure, enableColors),
  );
  const voices = voicesData.map(({ voice }) => voice);

  new Formatter().joinVoices(voices).format(voices, STAVE_WIDTH - 40);

  voicesData.forEach(({ voice, beams, tuplets }) => {
    voice.draw(context, stave);

    beams.forEach((beam) => {
      beam.setContext(context).draw();
    });

    tuplets.forEach((tuplet) => {
      tuplet.setContext(context).draw();
    });
  });

  return stave;
}
