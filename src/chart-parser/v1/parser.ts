import { type NoteEvent } from 'scan-chart';

import { Difficulty, ParsedChart } from '../types';
import { Beat, Duration, Measure, Note } from './types';
import { noteToKey } from '../utils';

export class ChartParser {
  measures: Measure[] = [];

  rawNotesByTick: Map<number, string[]> = new Map();

  endOfTrackTicks: number;

  private ppq: number;

  durationMap: { [key: number]: Duration };

  constructor(
    chart: ParsedChart,
    isFiveLane: boolean,
    difficulty: Difficulty = Difficulty.expert,
  ) {
    const drumTrack = chart.trackData.find(
      (t) => t.instrument === 'drums' && t.difficulty === difficulty,
    );

    if (!drumTrack) {
      throw new Error('no drum part');
    }

    this.ppq = chart.resolution;

    const allTicks = drumTrack.noteEventGroups.flat().map((e) => e.tick);
    this.endOfTrackTicks = allTicks.length > 0 ? Math.max(...allTicks) + 1 : 0;

    this.durationMap = this.constructDurationMap();

    this.processNotes(drumTrack.noteEventGroups, isFiveLane);
    this.createMeasures(chart.timeSignatures);
    this.fillBeats();
    this.extendNoteDuration();
    this.processCompositeDuration();
    this.flattenMeasures();
  }

  processNotes(noteEventGroups: NoteEvent[][], isFiveLane: boolean) {
    for (const group of noteEventGroups) {
      for (const event of group) {
        const key = noteToKey(event.type, event.flags, isFiveLane);
        if (!key) {
          continue;
        }
        const keys = this.rawNotesByTick.get(event.tick) ?? [];
        keys.push(key);
        this.rawNotesByTick.set(event.tick, keys);
      }
    }
  }

  createMeasures(timeSignatures: ParsedChart['timeSignatures']) {
    const ppq = this.ppq;
    const endOfTrackTicks = this.endOfTrackTicks ?? 0;

    const sigs =
      timeSignatures.length > 0
        ? timeSignatures
        : [{ tick: 0, numerator: 4, denominator: 4 }];

    let startTick = 0;

    sigs.forEach((sigData, index) => {
      const timeSignature: [number, number] = [
        sigData.numerator,
        sigData.denominator,
      ];
      const pulsesPerDivision = ppq / (timeSignature[1] / 4);
      const totalTimeSigTicks =
        (sigs[index + 1]?.tick ?? endOfTrackTicks) - sigData.tick;

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
          const tickKeys = this.rawNotesByTick.get(currentTick);

          if (tickKeys) {
            beat.notes.push({
              notes: tickKeys,
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

          if (!this.durationMap[noteDuration]) {
            note.duration = '';
            return;
          }

          const { duration, dotted, isTriplet } =
            this.durationMap[noteDuration];

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

                const isRest = note.isRest || index !== 0;
                const newNote: Note = {
                  isTriplet: isTriplet ?? false,
                  dotted: dotted ?? false,
                  durationTicks,
                  isRest,
                  tick: 0,
                  duration: `${duration}${isRest ? 'r' : ''}`,
                  notes: isRest ? ['b/4'] : note.notes,
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
    let closestDurationKey = this.ppq / 16;
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
        notes: note.isRest ? ['b/4'] : note.notes,
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
    const ppq = this.ppq;

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
