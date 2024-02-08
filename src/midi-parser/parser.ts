import { HeaderJSON, MidiJSON, TrackJSON } from '@tonejs/midi';
import { NoteJSON } from '@tonejs/midi/dist/Note';

export interface Note {
  notes: string[];
  dotted: boolean;
  duration: string;
  isTriplet: boolean;
  isRest: boolean;
  tick: number;
  durationTicks?: number;
}

export interface Beat {
  notes: Note[];
  startTick: number;
  endTick: number;
}

export interface Measure {
  timeSig: [number, number];
  sigChange: boolean;
  hasClef: boolean;
  notes: Note[];
  beats: Beat[];
  startTick: number;
  endTick: number;
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

export interface Duration {
  duration?: string;
  isTriplet?: boolean;
  dotted?: boolean;
}

export enum Difficulty {
  easy = 'easy',
  medium = 'medium',
  hard = 'hard',
  expert = 'expert',
}

export interface MidiMapping {
  [key: number]: string;
}

export class MidiParser {
  mapping: { [key in Difficulty]: MidiMapping } = {
    expert: {
      96: 'f/4', // kick
      97: 'c/5', // snare
      98: 'g/5/x2', // yellow tom
      99: 'f/5/x2', // blue tom
      100: 'a/5/x2', // green tom
    },
    hard: {
      84: 'f/4', // kick
      85: 'c/5', // snare
      86: 'g/5/x2', // yellow tom
      87: 'f/5/x2', // blue tom
      88: 'a/5/x2', // green tom
    },
    medium: {
      72: 'f/4', // kick
      73: 'c/5', // snare
      74: 'g/5/x2', // yellow tom
      75: 'f/5/x2', // blue tom
      76: 'a/5/x2', // green tom
    },
    easy: {
      60: 'f/4', // kick
      61: 'c/5', // snare
      62: 'g/5/x2', // yellow tom
      63: 'f/5/x2', // blue tom
      64: 'a/5/x2', // green tom
    },
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

  durationMap: { [key: number]: Duration };

  constructor(data: MidiJSON, difficulty: Difficulty = 'expert') {
    const drumPart = data.tracks.find((track) => track.name === 'PART DRUMS');

    if (!drumPart) {
      throw new Error('no drum part');
    }

    this.endOfTrackTicks = drumPart.endOfTrackTicks || 0;

    this.header = data.header;

    this.durationMap = this.constructDurationMap();

    this.processNotes(drumPart, difficulty);
    this.createMeasures();
    this.fillBeats();
    this.extendNoteDuration();
    this.processCompositeDuration();
    this.flattenMeasures();
  }

  processNotes(trackData: TrackJSON, difficulty: Difficulty) {
    trackData.notes.forEach((note) => {
      if (this.mapping[difficulty][note.midi]) {
        const tickData = this.rawMidiNotes.get(note.ticks) ?? [];
        tickData.push({
          note,
          key: this.mapping[difficulty][note.midi],
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

  getNoteKey(note: RawMidiNote, modifiers: ModifierNote[]) {
    return (
      modifiers.find((modifier) => modifier.modifier.forNote === note.note.midi)
        ?.modifier.key ?? note.key
    );
  }

  createMeasures() {
    const { ppq } = this.header;
    const endOfTrackTicks = this.endOfTrackTicks ?? 0;

    const timeSignatures =
      this.header.timeSignatures.length > 0
        ? this.header.timeSignatures
        : [
            {
              ticks: 0,
              timeSignature: [4, 4],
            },
          ];

    let startTick = 0;

    timeSignatures.forEach((timeSigData, index) => {
      const timeSignature: [number, number] = [
        timeSigData.timeSignature[0],
        timeSigData.timeSignature[1],
      ];
      const pulsesPerDivision = ppq / (timeSignature[1] / 4);
      const totalTimeSigTicks =
        (timeSignatures[index + 1]?.ticks ?? endOfTrackTicks) -
        timeSigData.ticks;

      const numberOfMeasures = Math.ceil(
        totalTimeSigTicks / pulsesPerDivision / timeSignature[0],
      );

      for (let measure = 0; measure < numberOfMeasures; measure += 1) {
        const endTick = startTick + timeSignature[0] * pulsesPerDivision;

        this.measures.push({
          timeSig: timeSignature,
          hasClef: index === 0 && measure === 0,
          sigChange: measure === 0,
          notes: [],
          beats: this.getBeats(timeSignature, startTick, endTick),
          startTick,
          endTick,
        });

        startTick += timeSignature[0] * pulsesPerDivision;
      }
    });
  }

  getBeats(
    timeSignature: [number, number],
    measureStartTick: number,
    measureEndTick: number,
  ): Beat[] {
    const numberOfBeats = timeSignature[0];
    const measureDuration = measureEndTick - measureStartTick;
    const beatDuration = measureDuration / numberOfBeats;

    return new Array(numberOfBeats).fill(null).map((_, index) => ({
      startTick: measureStartTick + index * beatDuration,
      endTick: measureStartTick + (index + 1) * beatDuration,
      notes: [],
    }));
  }

  fillBeats() {
    const step = 1;

    this.measures.forEach((measure) => {
      measure.beats.forEach((beat) => {
        for (
          let currentTick = beat.startTick;
          currentTick < beat.endTick;
          currentTick += step
        ) {
          const tickNotes = this.rawMidiNotes.get(currentTick);

          const currentModifierNotes = this.modifierNotes.filter(
            (modifier) =>
              currentTick >= modifier.note.ticks &&
              currentTick <= modifier.note.ticks + modifier.note.durationTicks,
          );

          if (tickNotes) {
            beat.notes.push({
              notes: tickNotes.map((note) =>
                this.getNoteKey(note, currentModifierNotes),
              ),
              isRest: false,
              dotted: false,
              isTriplet: false,
              duration: '32',
              tick: currentTick,
            });
          } else if (currentTick === beat.startTick) {
            beat.notes.push({
              notes: ['b/4'],
              isTriplet: false,
              isRest: true,
              dotted: false,
              duration: '32r',
              tick: currentTick,
            });
          }
        }
      });
    });
  }

  flattenMeasures() {
    this.measures.forEach((measure) => {
      measure.notes = this.collapseQRests(
        measure.beats.map((beat) => beat.notes).flat(),
      );
    });
  }

  collapseQRests(notes: Note[]) {
    const result: Note[] = [];
    let consecutiveRests: Note[] = [];

    notes.forEach((note) => {
      if (note.duration === 'qr' && consecutiveRests.length < 4) {
        consecutiveRests.push(note);
      } else {
        if (consecutiveRests.length > 0) {
          result.push(this.getCollapsedRest(consecutiveRests));
          consecutiveRests = [];
        }

        result.push(note);
      }
    });

    if (consecutiveRests.length > 0) {
      result.push(this.getCollapsedRest(consecutiveRests));
    }

    return result;
  }

  getCollapsedRest(notes: Note[]) {
    let duration: string;
    let dotted = false;
    switch (notes.length) {
      case 2:
        duration = 'hr';
        break;
      case 3:
        duration = 'hrd';
        dotted = true;
        break;
      case 4:
        duration = 'wr';
        break;
      default:
        duration = 'qr';
    }

    return {
      notes: ['b/4'],
      isRest: true,
      dotted,
      isTriplet: false,
      duration,
      tick: 0,
    };
  }

  extendNoteDuration() {
    this.measures.forEach((measure) => {
      measure.beats.forEach((beat) => {
        beat.notes.forEach((note, index) => {
          const noteDuration =
            (beat.notes[index + 1]?.tick ?? beat.endTick) - note.tick;

          note.durationTicks = noteDuration;

          const { duration, dotted, isTriplet } = this.durationMap[
            noteDuration
          ] ?? { duration: '' };

          note.duration = duration
            ? `${duration}${note.isRest ? 'r' : ''}`
            : '';

          if (dotted) {
            note.dotted = true;
          }
          if (isTriplet) {
            note.isTriplet = true;
          }
        });
      });
    });
  }

  processCompositeDuration() {
    const availableDurations = Object.keys(this.durationMap).map((key) =>
      Number(key),
    );

    this.measures.forEach((measure) => {
      measure.beats.forEach((beat) => {
        beat.notes = beat.notes
          .map((note) => {
            if (note.duration) {
              return note;
            }

            const atomicDurations = this.getSubsets(
              availableDurations,
              note.durationTicks ?? 0,
            );

            if (atomicDurations.length === 0) {
              return this.getClosestDuration(availableDurations, note);
            }

            return atomicDurations
              .sort((a, b) => a.length - b.length)[0]
              .sort((a, b) => b - a)
              .map((durationTicks, index) => {
                const { duration, dotted, isTriplet } =
                  this.durationMap[durationTicks];

                const isRest = note.isRest || index === 0;
                const newNote: Note = {
                  isTriplet: isTriplet ?? false,
                  dotted: dotted ?? false,
                  durationTicks,
                  isRest,
                  tick: 0,
                  duration: `${duration}${isRest ? 'r' : ''}`,
                  notes: ['b/4'],
                };

                return newNote;
              });
          })
          .flat();
      });
    });
  }

  getClosestDuration(availableDurations: number[], note: Note) {
    let durationDiff = Infinity;
    let closestDurationKey = this.header.ppq / 16;
    availableDurations.forEach((duration) => {
      const diff = Math.abs(duration - (note.durationTicks ?? 0));
      if (diff < durationDiff) {
        closestDurationKey = duration;
        durationDiff = diff;
      }
    });

    const { duration, isTriplet, dotted } =
      this.durationMap[closestDurationKey];

    return [
      {
        isTriplet: isTriplet ?? false,
        dotted: dotted ?? false,
        durationTicks: note.durationTicks,
        isRest: note.isRest,
        tick: 0,
        duration: `${duration}${note.isRest ? 'r' : ''}`,
        notes: ['b/4'],
      },
    ];
  }

  getSubsets(array: number[], sum: number) {
    const result: number[][] = [];

    function fork(i = 0, s = 0, t: number[] = []) {
      if (s === sum) {
        result.push(t);
        return;
      }
      if (i === array.length) {
        return;
      }
      if (s + array[i] <= sum) {
        fork(i + 1, s + array[i], t.concat(array[i]));
      }
      fork(i + 1, s, t);
    }

    fork();

    return result;
  }

  constructDurationMap() {
    const { ppq } = this.header;

    return {
      [ppq]: { duration: 'q' },
      [ppq / 2]: { duration: '8' },
      [ppq / 3]: { duration: '8', isTriplet: true },
      [ppq / 2 + ppq / 4]: { duration: '8d', dotted: true },
      [ppq / 4]: { duration: '16' },
      [ppq / 4 + ppq / 8]: { duration: '16d', dotted: true },
      [ppq / 6]: { duration: '16', isTriplet: true },
      [ppq / 8]: { duration: '32' },
      [ppq / 8 + ppq / 16]: { duration: '32d', dotted: true },
      [ppq / 12]: { duration: '32', isTriplet: true },
      [ppq / 16]: { duration: '64' },
      [ppq / 16 + ppq / 32]: { duration: '64d', dotted: true },
      [ppq / 24]: { duration: '64', isTriplet: true },
    };
  }
}
