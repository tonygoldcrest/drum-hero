import { HeaderJSON, MidiJSON, TrackJSON } from '@tonejs/midi';
import { NoteJSON } from '@tonejs/midi/dist/Note';
import React from 'react';
import Vex from 'vexflow';
import { Song } from './song';

export default class MidiRenderer {
  song: Song;

  constructor(
    public data: MidiJSON,
    public elementRef: React.RefObject<HTMLDivElement>,
  ) {
    this.song = new Song(data);
  }

  render() {
    if (!this.elementRef.current) {
      return;
    }

    const { Renderer, Stave, StaveNote, Formatter, Beam } = Vex.Flow;

    // Create an SVG renderer and attach it to the DIV element with id="output".
    const renderer = new Renderer(
      this.elementRef.current,
      Renderer.Backends.SVG,
    );

    // Configure the rendering context.
    renderer.resize(3000, 3000);
    const context = renderer.getContext();
    context.setFont('Roboto', 10);

    let xOffset = 0;
    let yOffset = 0;
    const verticalOffset = 100;

    this.song.measures.forEach((measure, index) => {
      const stave = new Stave(xOffset, yOffset, 300);

      if (measure.hasClef) {
        stave.addClef('percussion');
      }
      if (measure.sigChange) {
        stave.addTimeSignature(`${measure.timeSig[0]}/${measure.timeSig[1]}`);
      }
      stave.setContext(context).draw();

      if (measure.tickNotes.length) {
        const notes = measure.tickNotes.map((tickNote) => {
          return new StaveNote({
            keys: tickNote.notes.map((n) => n.key),
            duration: tickNote.duration,
            align_center: tickNote.duration === 'wr',
          });
        });

        const beams = Beam.generateBeams(notes, {
          flat_beams: true,
          stem_direction: -1,
          // flat_beam_offset: 150,
        });

        Formatter.FormatAndDraw(context, stave, notes);

        beams.forEach((b) => {
          b.setContext(context).draw();
        });
      }

      if ((index + 1) % 4 === 0) {
        xOffset = 0;
        yOffset += verticalOffset;
      } else {
        xOffset += stave.getWidth();
      }
    });
  }
}
