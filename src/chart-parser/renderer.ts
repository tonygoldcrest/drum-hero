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
  Parenthesis,
  Glyph,
  Flow,
} from 'vexflow';
import { ChartParser } from './parser';
import { Measure, RenderData } from './types';
import themedark from '../renderer/theme';

const STAVE_WIDTH = 600;
const STAVE_PER_ROW = 2;
const NOTE_COLOR_MAP: { [key: string]: string } = {
  'e/4': themedark.color.orange,
  'f/4': themedark.color.orange,
  'c/5': themedark.color.red,
  'g/5/x2': themedark.color.yellow,
  'f/5/x2': themedark.color.blue,
  'a/5/x2': themedark.color.green,
  'e/5': themedark.color.yellow,
  'd/5': themedark.color.blue,
  'a/4': themedark.color.green,
};
const STEM_DIRECTION = -1;
const REST_KEY = 'b/4';
const ACCENT_SCALE = Flow.NOTATION_FONT_SCALE;
const ACCENT_SCALE_RIGHT = Flow.NOTATION_FONT_SCALE * 0.8;

export function renderMusic(
  elementRef: React.RefObject<HTMLDivElement | null>,
  song: ChartParser,
  showBarNumbers: boolean = true,
  enableColors: boolean = false,
  showTempo: boolean = true,
): RenderData[] {
  if (!elementRef.current) {
    return [];
  }

  const renderer = new Renderer(elementRef.current, Renderer.Backends.SVG);
  const context = renderer.getContext();

  context.setFillStyle(themedark.color.ink);
  context.setStrokeStyle(themedark.color.ink);

  const lineHeight = showBarNumbers ? 180 : 130;

  renderer.resize(
    STAVE_WIDTH * STAVE_PER_ROW + 10,
    Math.ceil(song.measures.length / STAVE_PER_ROW) * lineHeight + 50,
  );

  return song.measures.map((measure, index) => {
    const { stave, renderedNotes } = renderMeasure(
      context,
      measure,
      index,
      (index % STAVE_PER_ROW) * STAVE_WIDTH,
      Math.floor(index / STAVE_PER_ROW) * lineHeight,
      index === song.measures.length - 1,
      showBarNumbers,
      enableColors,
      showTempo,
    );

    return { measure, stave, renderedNotes };
  });
}

function buildVoice(measure: Measure, enableColors: boolean) {
  const tupletGroups = new Map<number, StaveNote[]>();
  const staveNotes = measure.notes.map((note) => {
    const isMeasureRest = note.isRest && measure.notes.length === 1;
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

    if (!note.isRest && note.ghosts?.length) {
      staveNote.keys.forEach((key, keyIndex) => {
        if (note.ghosts?.includes(key)) {
          staveNote.addModifier(
            new Parenthesis(ModifierPosition.LEFT),
            keyIndex,
          );
          staveNote.addModifier(
            new Parenthesis(ModifierPosition.RIGHT),
            keyIndex,
          );
        }
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

  return { voice, beams, tuplets, staveNotes };
}

function drawAccentGlyph(
  context: RenderContext,
  x: number,
  y: number,
  originX: number,
  originY: number,
  scale: number,
  color: string,
) {
  const glyph = new Glyph('articAccentAbove', scale);

  glyph.setOrigin(originX, originY);
  context.openGroup('accent');
  context.setFillStyle(color);
  context.setStrokeStyle(color);
  glyph.render(context, x, y);
  context.closeGroup();
}

function drawAccents(
  context: RenderContext,
  stave: Stave,
  measure: Measure,
  staveNotes: StaveNote[],
  enableColors: boolean,
) {
  const gap = stave.getSpacingBetweenLines();
  const topLineY = stave.getYForLine(0);
  const colorOf = (key: string) =>
    enableColors ? NOTE_COLOR_MAP[key] : themedark.color.ink;

  context.save();

  staveNotes.forEach((staveNote, index) => {
    const note = measure.notes[index];

    if (!note.accents?.length) {
      return;
    }

    const ys = staveNote.getYs();
    const wholeChord = note.notes.every((key) => note.accents?.includes(key));

    if (wholeChord) {
      const { x } = staveNote.getModifierStartXY(ModifierPosition.ABOVE, 0);
      const color =
        note.notes.length === 1 ? colorOf(note.notes[0]) : themedark.color.ink;

      drawAccentGlyph(
        context,
        x,
        Math.min(...ys, topLineY) - gap,
        0.5,
        1,
        ACCENT_SCALE,
        color,
      );

      return;
    }

    note.accents.forEach((key) => {
      const keyIndex = note.notes.indexOf(key);

      if (keyIndex < 0) {
        return;
      }

      const { x } = staveNote.getModifierStartXY(
        ModifierPosition.RIGHT,
        keyIndex,
      );

      drawAccentGlyph(
        context,
        x + gap / 2,
        ys[keyIndex],
        0.2,
        0.5,
        ACCENT_SCALE_RIGHT,
        colorOf(key),
      );
    });
  });

  context.restore();
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
  showTempo: boolean,
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

  if (showTempo && measure.tempo) {
    stave.setTempo(measure.tempo, 0);
  }

  if (showBarNumbers) {
    stave.setText(`${index}`, ModifierPosition.ABOVE, {
      justification: TextJustification.LEFT,
    });
  }

  stave
    .setStyle({
      fillStyle: themedark.color.textMuted,
      strokeStyle: themedark.color.textMuted,
    })
    .setContext(context)
    .draw();

  const { voice, beams, tuplets, staveNotes } = buildVoice(
    measure,
    enableColors,
  );

  new Formatter().joinVoices([voice]).format([voice], STAVE_WIDTH - 40);
  voice.draw(context, stave);
  beams.forEach((beam) => {
    beam.setContext(context).draw();
  });
  tuplets.forEach((tuplet) => {
    tuplet.setContext(context).draw();
  });
  drawAccents(context, stave, measure, staveNotes, enableColors);

  const renderedNotes = staveNotes.map((staveNote, i) => ({
    tick: measure.notes[i].tick,
    note: staveNote,
    accents: measure.notes[i].accents,
    ghosts: measure.notes[i].ghosts,
  }));

  return { stave, renderedNotes };
}
