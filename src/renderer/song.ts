import { HeaderJSON, MidiJSON, TrackJSON } from '@tonejs/midi';
import { NoteJSON } from '@tonejs/midi/dist/Note';

export interface Note {
  key: string;
}

export interface TickNote {
  notes: Note[];
  duration: string;
  tick: number;
}

export interface Measure {
  timeSig: [number, number];
  sigChange: boolean;
  hasClef: boolean;
  tickNotes: TickNote[];
  startTick: number;
  endTick?: number;
  durationTicks?: number;
}

export interface RawMidiNote {
  note: NoteJSON;
  key: string;
}

export interface Modifier {
  forNote: number;
  key: string;
}

export interface ModifierNote {
  note: NoteJSON;
  modifier: Modifier;
}

export class Song {
  mapping: { [key: number]: string } = {
    96: 'f/4',
    97: 'c/5',
    98: 'g/5/x2',
    99: 'f/5/x2',
    100: 'a/5/x2',
  };

  tomModifiers: { [key: number]: Modifier } = {
    110: {
      forNote: 98,
      key: 'e/5',
    },
    111: {
      forNote: 99,
      key: 'd/5',
    },
    112: {
      forNote: 100,
      key: 'a/4',
    },
  };

  measures: Measure[] = [];

  rawMidiNotes: Map<number, RawMidiNote[]> = new Map();

  endOfTrackTicks: number;

  modifierNotes: ModifierNote[] = [];

  header: HeaderJSON;

  constructor(data: MidiJSON) {
    const drumPart = data.tracks.find((track) => track.name === 'PART DRUMS');

    if (!drumPart) {
      throw new Error('no drum part');
    }

    this.endOfTrackTicks = drumPart.endOfTrackTicks || 0;

    this.header = data.header;

    this.processNotes(drumPart);
    this.parse();
    this.addWholeRests();
    console.log(this.measures, this.header.ppq);
  }

  processNotes(trackData: TrackJSON) {
    trackData.notes.forEach((note) => {
      if (this.mapping[note.midi]) {
        const tickData = this.rawMidiNotes.get(note.ticks) ?? [];
        tickData.push({
          note,
          key: this.mapping[note.midi],
        });
        this.rawMidiNotes.set(note.ticks, tickData);
      } else if (this.tomModifiers[note.midi]) {
        this.modifierNotes.push({
          note,
          modifier: this.tomModifiers[note.midi],
        });
      }
    });
  }

  areTimeSigEqual(ts1: [number, number], ts2: [number, number]) {
    return ts1[0] === ts2[0] && ts1[1] === ts2[1];
  }

  getCurrentTimeSig(currentTick: number) {
    const { timeSignatures } = this.header;
    const timeSignatureIndex = timeSignatures.findIndex(
      ({ ticks }) => currentTick < ticks,
    );
    return (
      (timeSignatures[
        (timeSignatureIndex === -1
          ? timeSignatures.length
          : timeSignatureIndex) - 1
      ]?.timeSignature as [number, number]) ?? [4, 4]
    );
  }

  getNoteKey(note: RawMidiNote, modifiers: ModifierNote[]) {
    return (
      modifiers.find((modifier) => modifier.modifier.forNote === note.note.midi)
        ?.modifier.key ?? note.key
    );
  }

  parse() {
    const { ppq } = this.header;
    let currentMeasure: Measure = {
      sigChange: true,
      timeSig: [4, 4],
      hasClef: true,
      tickNotes: [],
      startTick: 0,
    };
    this.measures.push(currentMeasure);

    let notes: TickNote[] = [];
    let currentMeasureTicks = 0;
    const step = ppq / 16;

    for (
      let currentTick = 0, currentModifierNotes: ModifierNote[] = [];
      currentTick < this.endOfTrackTicks;
      currentTick += step
    ) {
      const timeSignature = this.getCurrentTimeSig(currentTick);
      const pulsesPerDivision = ppq / (timeSignature[1] / 4);

      if (currentMeasureTicks === pulsesPerDivision * timeSignature[0]) {
        const sigChange = !this.areTimeSigEqual(
          timeSignature,
          this.measures[this.measures.length - 1].timeSig,
        );
        currentMeasure.endTick = currentTick;

        currentMeasure = {
          timeSig: timeSignature,
          sigChange,
          tickNotes: notes,
          startTick: currentTick,
          durationTicks: currentMeasureTicks / step,
          hasClef: false,
        };

        this.measures.push(currentMeasure);

        notes = [];
        currentMeasureTicks = 0;
      }

      const tickNotes = this.rawMidiNotes.get(currentTick);

      currentModifierNotes.push(
        ...this.modifierNotes.filter(
          (modifier) => modifier.note.ticks === currentTick,
        ),
      );

      currentModifierNotes = currentModifierNotes.filter(
        (modifier) =>
          modifier.note.durationTicks + modifier.note.ticks !== currentTick,
      );

      if (tickNotes) {
        currentMeasure.tickNotes.push({
          notes: tickNotes.map((note) => ({
            key: this.getNoteKey(note, currentModifierNotes),
          })),
          duration: '32',
          tick: currentMeasureTicks / step,
        });
      }

      currentMeasureTicks += step;
    }
  }

  addWholeRests() {
    this.measures.forEach((measure) => {
      if (measure.tickNotes.length === 0) {
        measure.tickNotes.push({
          notes: [{ key: 'c/5' }],
          duration: 'wr',
          tick: 0,
        });
      }
    });
  }

  // extendNoteDuration() {
  //   this.measures.forEach((measure) => {
  //     measure.tickNotes.forEach((tickNote, index) => {

  //     });
  //   });
  // }
}
