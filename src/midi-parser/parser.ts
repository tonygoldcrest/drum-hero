import { HeaderJSON, MidiJSON, TrackJSON } from '@tonejs/midi';
import { NoteJSON } from '@tonejs/midi/dist/Note';

/**
 * Clone Hero drum midi -> sheet music model.
 *
 * Every charted gem is a zero-length midi event, so rhythm has to be
 * inferred. The pipeline:
 *
 *  1. Map midi pitches to drum staff keys (applying pro-drums tom markers).
 *     Drum notation puts everything on one voice with stems down, so kicks,
 *     snares, toms and cymbals that share a tick become a single chord.
 *  2. Build measures/beats from the time signature track.
 *  3. For every beat, fit the onsets against a set of candidate subdivision
 *     grids (straight, dotted, triplet, quintuplet, septuplet, ...). Each
 *     candidate is scored by how far the onsets are from its grid points plus
 *     a complexity prior, so an exact chart is reproduced exactly and a
 *     humanized chart snaps to the most plausible interpretation. A beat can
 *     also be split in half and each half fitted independently (e.g. straight
 *     16ths followed by a 16th triplet).
 *  4. The winning grid is rendered into notes/rests whose durations merge
 *     empty grid slots, with tuplet groups emitted as explicit metadata.
 */

export enum Difficulty {
  easy = 'easy',
  medium = 'medium',
  hard = 'hard',
  expert = 'expert',
}

export interface MidiMapping {
  [key: number]: string;
}

export interface TupletMeta {
  id: number;
  numNotes: number;
  notesOccupied: number;
}

export interface Note {
  notes: string[];
  duration: string;
  dots: number;
  isRest: boolean;
  tick: number;
  tupletId?: number;
  // Ornamental hits (flams/drags) drawn before this note, out of time. Each
  // entry is a chord of keys.
  graceNotes?: string[][];
}

export interface Measure {
  timeSig: [number, number];
  sigChange: boolean;
  hasClef: boolean;
  isCompound: boolean;
  startTick: number;
  endTick: number;
  notes: Note[];
  tuplets: TupletMeta[];
}

export interface Modifier {
  forNotes: number[];
  key: string;
}

interface Onset {
  tick: number;
  keys: string[];
  graceNotes?: string[][];
}

interface Meter {
  beatsPerMeasure: number;
  beatTicks: number;
  beatFraction: number;
  isCompound: boolean;
}

interface GridCandidate {
  divisions: number;
  notatedDivisor: number;
  tuplet: { numNotes: number; notesOccupied: number } | null;
  penalty: number;
}

interface GridFit {
  candidate: GridCandidate;
  score: number;
  slots: number[];
}

interface SpanFit {
  score: number;
  events: Note[];
  tuplets: TupletMeta[];
}

interface MarkerInterval {
  startTick: number;
  endTick: number;
}

interface BeatLocation {
  measureIndex: number;
  beatIndex: number;
}

const REST_KEY = 'b/4';

// Finest in-time subdivision of a beat. Hits that fall in the same slot at this
// resolution can't be drawn as distinct in-time notes, so they collapse to a
// chord (different drums) or a flam/grace note (same drum) instead of being
// dropped. Also the resolution floor that guarantees the grid fitter can always
// separate every remaining onset.
const MAX_DIVISIONS = 16;

// An onset further than this fraction of a grid slot from every grid point
// disqualifies the candidate (unless nothing else fits).
const MAX_SLOT_ERROR = 0.35;

// Flat cost of notating a beat as two independent half-beat groups.
const SPLIT_PENALTY = 0.04;

// Candidate subdivisions of a plain (non-dotted) beat. `notatedDivisor` is
// the binary subdivision the written note values come from; for tuplet grids
// the remaining scaling is carried by the tuplet ratio. Penalties encode how
// "exotic" a reading is, so when several grids explain the onsets equally
// well the simplest one wins (every n=2 pattern also fits n=4, etc).
const SIMPLE_GRIDS: GridCandidate[] = [
  { divisions: 1, notatedDivisor: 1, tuplet: null, penalty: 0 },
  { divisions: 2, notatedDivisor: 2, tuplet: null, penalty: 0.01 },
  { divisions: 4, notatedDivisor: 4, tuplet: null, penalty: 0.02 },
  { divisions: 8, notatedDivisor: 8, tuplet: null, penalty: 0.045 },
  { divisions: 16, notatedDivisor: 16, tuplet: null, penalty: 0.09 },
  {
    divisions: 3,
    notatedDivisor: 2,
    tuplet: { numNotes: 3, notesOccupied: 2 },
    penalty: 0.06,
  },
  {
    divisions: 6,
    notatedDivisor: 4,
    tuplet: { numNotes: 6, notesOccupied: 4 },
    penalty: 0.1,
  },
  {
    divisions: 12,
    notatedDivisor: 8,
    tuplet: { numNotes: 12, notesOccupied: 8 },
    penalty: 0.15,
  },
  {
    divisions: 5,
    notatedDivisor: 4,
    tuplet: { numNotes: 5, notesOccupied: 4 },
    penalty: 0.26,
  },
  {
    divisions: 7,
    notatedDivisor: 4,
    tuplet: { numNotes: 7, notesOccupied: 4 },
    penalty: 0.3,
  },
  {
    divisions: 9,
    notatedDivisor: 8,
    tuplet: { numNotes: 9, notesOccupied: 8 },
    penalty: 0.34,
  },
];

// Candidate subdivisions of a dotted (compound meter) beat. All of these are
// expressible with plain or dotted values, no tuplets needed: dividing a
// dotted quarter by 2 gives dotted eighths, by 3 gives straight eighths.
const COMPOUND_GRIDS: GridCandidate[] = [
  { divisions: 1, notatedDivisor: 1, tuplet: null, penalty: 0 },
  { divisions: 3, notatedDivisor: 3, tuplet: null, penalty: 0.02 },
  { divisions: 2, notatedDivisor: 2, tuplet: null, penalty: 0.05 },
  { divisions: 6, notatedDivisor: 6, tuplet: null, penalty: 0.07 },
  { divisions: 4, notatedDivisor: 4, tuplet: null, penalty: 0.1 },
  { divisions: 12, notatedDivisor: 12, tuplet: null, penalty: 0.13 },
];

const BASE_DURATIONS: Array<[number, string]> = [
  [1, 'w'],
  [1 / 2, 'h'],
  [1 / 4, 'q'],
  [1 / 8, '8'],
  [1 / 16, '16'],
  [1 / 32, '32'],
  [1 / 64, '64'],
];

// Note/rest value sizes (in grid slots) we are willing to merge into a single
// written duration, largest first.
const CHUNK_SIZES = [16, 12, 8, 6, 4, 3, 2, 1];

const KEY_LETTERS = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];

function approxEqual(a: number, b: number) {
  return Math.abs(a - b) < Math.max(a, b) * 1e-9;
}

/**
 * Express a fraction of a whole note as a single written duration, if
 * possible: either a plain binary value or a single-dotted one.
 */
function namedDuration(
  fraction: number,
): { duration: string; dots: number } | null {
  const match = BASE_DURATIONS.find(
    ([base]) =>
      approxEqual(fraction, base) || approxEqual(fraction, base * 1.5),
  );

  if (!match) {
    return null;
  }

  return {
    duration: match[1],
    dots: approxEqual(fraction, match[0]) ? 0 : 1,
  };
}

function isPowerOfTwo(value: number) {
  return Number.isInteger(Math.log2(value));
}

/**
 * The slot index multiple a chunk of the given size must start on. Binary
 * chunks sit on multiples of their own size, dotted chunks (3·2^k slots) on
 * multiples of 2^(k+1) — e.g. a dotted eighth among 16ths can start on the
 * beat or on the "and", but not on an off 16th.
 */
function chunkAlignment(size: number) {
  return isPowerOfTwo(size) ? size : (size / 3) * 2;
}

/**
 * Greedily split `span` grid slots starting at `startSlot` into the fewest
 * metrically aligned written durations. `slotFraction` is the written value
 * of one slot as a fraction of a whole note.
 */
function chunkSpan(
  startSlot: number,
  span: number,
  slotFraction: number,
  allowDotted: boolean,
): number[] {
  const fits = (candidate: number, position: number, remaining: number) => {
    if (candidate > remaining || position % chunkAlignment(candidate)) {
      return false;
    }
    const named = namedDuration(candidate * slotFraction);
    return named !== null && (allowDotted || named.dots === 0);
  };

  const chunks: number[] = [];
  let position = startSlot;
  let remaining = span;

  while (remaining > 0) {
    const currentPosition = position;
    const currentRemaining = remaining;
    const size =
      CHUNK_SIZES.find((candidate) =>
        fits(candidate, currentPosition, currentRemaining),
      ) ?? 1;

    chunks.push(size);
    position += size;
    remaining -= size;
  }

  return chunks;
}

function keyPitch(key: string) {
  const [letter, octave] = key.split('/');
  return Number(octave) * 7 + KEY_LETTERS.indexOf(letter);
}

function sortKeys(keys: string[]) {
  return [...new Set(keys)].sort((a, b) => keyPitch(a) - keyPitch(b));
}

/**
 * Collapse the onsets of one beat that fall in the same finest-resolution slot,
 * without ever dropping a hit. Two onsets too close to separate become either a
 * chord (different drums — meant to be simultaneous) or a flam (same drum — the
 * earlier hit is kept as a grace note on the later one). After this every
 * returned onset occupies a distinct `MAX_DIVISIONS` slot, so the grid fitter
 * can always give each its own position.
 */
function resolveNearCoincidence(
  onsets: Onset[],
  beatStart: number,
  beatTicks: number,
): Onset[] {
  const spacing = beatTicks / MAX_DIVISIONS;
  const slotOf = (tick: number) =>
    Math.min(
      MAX_DIVISIONS - 1,
      Math.max(0, Math.round((tick - beatStart) / spacing)),
    );

  const clusters: Onset[][] = [];
  onsets.forEach((onset) => {
    const last = clusters[clusters.length - 1];
    if (last && slotOf(last[0].tick) === slotOf(onset.tick)) {
      last.push(onset);
    } else {
      clusters.push([onset]);
    }
  });

  return clusters.map(resolveCluster);
}

function resolveCluster(cluster: Onset[]): Onset {
  if (cluster.length === 1) {
    return cluster[0];
  }

  const occurrences = cluster.flatMap((onset) =>
    onset.keys.map((key) => ({ tick: onset.tick, key })),
  );

  // For each drum, its latest occurrence is the main hit; earlier repeats of the
  // same drum become grace notes.
  const lastTickByKey = new Map<string, number>();
  occurrences.forEach(({ tick, key }) => {
    lastTickByKey.set(key, Math.max(lastTickByKey.get(key) ?? -Infinity, tick));
  });

  const graceByTick = new Map<number, Set<string>>();
  occurrences.forEach(({ tick, key }) => {
    if (tick < (lastTickByKey.get(key) as number)) {
      const keys = graceByTick.get(tick) ?? new Set<string>();
      keys.add(key);
      graceByTick.set(tick, keys);
    }
  });

  const graceNotes = [...graceByTick.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, keys]) => sortKeys([...keys]));

  return {
    tick: cluster[cluster.length - 1].tick,
    keys: sortKeys([...lastTickByKey.keys()]),
    graceNotes: graceNotes.length > 0 ? graceNotes : undefined,
  };
}

function makeMeter(timeSig: [number, number], ppq: number): Meter {
  const [numerator, denominator] = timeSig;
  const pulseTicks = (ppq * 4) / denominator;
  const isCompound = denominator >= 8 && numerator >= 6 && numerator % 3 === 0;
  const beatsPerMeasure = isCompound ? numerator / 3 : numerator;
  const beatTicks = isCompound ? pulseTicks * 3 : pulseTicks;

  return {
    beatsPerMeasure,
    beatTicks,
    beatFraction: beatTicks / (ppq * 4),
    isCompound,
  };
}

function intervalsCoverTick(intervals: MarkerInterval[], tick: number) {
  let low = 0;
  let high = intervals.length - 1;
  let found = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (intervals[mid].startTick <= tick) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return found >= 0 && intervals[found].endTick > tick;
}

/**
 * Score every candidate grid against the onsets and return the best fit.
 * Returns null only when every candidate collapses two onsets into the same
 * slot (the caller then merges the offending onsets and retries).
 */
function pickGrid(
  onsets: Onset[],
  startTick: number,
  durationTicks: number,
  fraction: number,
  candidates: GridCandidate[],
): GridFit | null {
  let strict: GridFit | null = null;
  let loose: GridFit | null = null;

  candidates.forEach((candidate) => {
    if (!namedDuration(fraction / candidate.notatedDivisor)) {
      return;
    }

    const spacing = durationTicks / candidate.divisions;
    const slots: number[] = [];
    let maxError = 0;
    let totalError = 0;

    const collision = onsets.some((onset) => {
      const position = (onset.tick - startTick) / spacing;
      const slot = Math.min(
        candidate.divisions - 1,
        Math.max(0, Math.round(position)),
      );
      if (slots.includes(slot)) {
        return true;
      }
      slots.push(slot);
      const error = Math.abs(position - slot);
      maxError = Math.max(maxError, error);
      totalError += error;
      return false;
    });

    if (collision) {
      return;
    }

    const score = totalError / onsets.length + maxError + candidate.penalty;
    const fit = { candidate, score, slots };

    if (maxError <= MAX_SLOT_ERROR && (!strict || score < strict.score)) {
      strict = fit;
    }
    if (!loose || score < loose.score) {
      loose = fit;
    }
  });

  return strict ?? loose;
}

export class MidiParser {
  mapping: { [key in Difficulty]: MidiMapping } = {
    expert: {
      95: 'e/4', // kick
      96: 'f/4', // kick
      97: 'c/5', // snare
      98: 'g/5/x2', // yellow cymbal
      99: 'f/5/x2', // blue cymbal
      100: 'a/5/x2', // green cymbal
    },
    hard: {
      84: 'f/4', // kick
      85: 'c/5', // snare
      86: 'g/5/x2', // yellow cymbal
      87: 'f/5/x2', // blue cymbal
      88: 'a/5/x2', // green cymbal
    },
    medium: {
      72: 'f/4', // kick
      73: 'c/5', // snare
      74: 'g/5/x2', // yellow cymbal
      75: 'f/5/x2', // blue cymbal
      76: 'a/5/x2', // green cymbal
    },
    easy: {
      60: 'f/4', // kick
      61: 'c/5', // snare
      62: 'g/5/x2', // yellow cymbal
      63: 'f/5/x2', // blue cymbal
      64: 'a/5/x2', // green cymbal
    },
  };

  mappingFiveLane: { [key in Difficulty]: MidiMapping } = {
    expert: {
      95: 'e/4', // kick
      96: 'f/4', // kick
      97: 'c/5', // snare
      98: 'g/5/x2', // yellow cymbal
      99: 'd/5', // blue tom
      100: 'a/5/x2', // green cymbal
      101: 'a/4', // green tom
    },
    hard: {
      84: 'f/4', // kick
      85: 'c/5', // snare
      86: 'g/5/x2', // yellow cymbal
      87: 'd/5', // blue tom
      88: 'a/5/x2', // green cymbal
      89: 'a/4', // green tom
    },
    medium: {
      72: 'f/4', // kick
      73: 'c/5', // snare
      74: 'g/5/x2', // yellow cymbal
      75: 'd/5', // blue tom
      76: 'a/5/x2', // green cymbal
      77: 'a/4', // green tom
    },
    easy: {
      60: 'f/4', // kick
      61: 'c/5', // snare
      62: 'g/5/x2', // yellow cymbal
      63: 'd/5', // blue tom
      64: 'a/5/x2', // green cymbal
      65: 'a/4', // green tom
    },
  };

  tomModifiers: { [key: number]: Modifier } = {
    110: {
      forNotes: [98, 86, 74, 62],
      key: 'e/5', // yellow tom
    },
    111: {
      forNotes: [99, 87, 75, 63],
      key: 'd/5', // blue tom
    },
    112: {
      forNotes: [100, 88, 76, 64],
      key: 'a/4', // green tom
    },
  };

  measures: Measure[] = [];

  header: HeaderJSON;

  endOfTrackTicks: number;

  private ppq: number;

  private meters: Meter[] = [];

  private nextTupletId = 0;

  constructor(
    data: MidiJSON,
    isFiveLane: boolean,
    difficulty: Difficulty = Difficulty.expert,
  ) {
    const drumPart = data.tracks.find((track) => track.name === 'PART DRUMS');

    if (!drumPart) {
      throw new Error('no drum part');
    }

    this.header = data.header;
    this.ppq = data.header.ppq;

    const lastNoteEnd = drumPart.notes.reduce(
      (max, note) => Math.max(max, note.ticks + note.durationTicks),
      0,
    );
    this.endOfTrackTicks = Math.max(drumPart.endOfTrackTicks ?? 0, lastNoteEnd);

    const onsets = this.collectOnsets(drumPart, isFiveLane, difficulty);
    this.createMeasures();
    this.buildMeasures(onsets);
  }

  private collectOnsets(
    trackData: TrackJSON,
    isFiveLane: boolean,
    difficulty: Difficulty,
  ): Onset[] {
    const mapping = (isFiveLane ? this.mappingFiveLane : this.mapping)[
      difficulty
    ];

    const markerForGem = new Map<number, number>();
    Object.entries(this.tomModifiers).forEach(([markerPitch, modifier]) => {
      modifier.forNotes.forEach((gem) =>
        markerForGem.set(gem, Number(markerPitch)),
      );
    });

    const markerIntervals = new Map<number, MarkerInterval[]>();
    trackData.notes.forEach((note) => {
      if (this.tomModifiers[note.midi]) {
        const intervals = markerIntervals.get(note.midi) ?? [];
        intervals.push({
          startTick: note.ticks,
          endTick: note.ticks + note.durationTicks,
        });
        markerIntervals.set(note.midi, intervals);
      }
    });
    markerIntervals.forEach((intervals) =>
      intervals.sort((a, b) => a.startTick - b.startTick),
    );

    const byTick = new Map<number, string[]>();

    trackData.notes.forEach((note) => {
      if (!mapping[note.midi]) {
        return;
      }

      const key = this.gemKey(note, mapping, markerForGem, markerIntervals);
      const keys = byTick.get(note.ticks) ?? [];
      keys.push(key);
      byTick.set(note.ticks, keys);
    });

    return [...byTick.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([tick, keys]) => ({ tick, keys }));
  }

  private gemKey(
    note: NoteJSON,
    mapping: MidiMapping,
    markerForGem: Map<number, number>,
    markerIntervals: Map<number, MarkerInterval[]>,
  ): string {
    const markerPitch = markerForGem.get(note.midi);

    if (markerPitch !== undefined) {
      const intervals = markerIntervals.get(markerPitch);
      if (intervals && intervalsCoverTick(intervals, note.ticks)) {
        return this.tomModifiers[markerPitch].key;
      }
    }

    return mapping[note.midi];
  }

  private createMeasures() {
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
      const timeSig: [number, number] = [
        timeSigData.timeSignature[0] ?? 4,
        timeSigData.timeSignature[1] ?? 4,
      ];
      const meter = makeMeter(timeSig, this.ppq);
      const measureTicks = meter.beatsPerMeasure * meter.beatTicks;
      const sectionTicks =
        (timeSignatures[index + 1]?.ticks ?? this.endOfTrackTicks) -
        timeSigData.ticks;
      const numberOfMeasures = Math.max(
        0,
        Math.ceil(sectionTicks / measureTicks - 1e-9),
      );

      for (let measure = 0; measure < numberOfMeasures; measure += 1) {
        this.measures.push({
          timeSig,
          hasClef: this.measures.length === 0,
          sigChange: measure === 0,
          isCompound: meter.isCompound,
          startTick,
          endTick: startTick + measureTicks,
          notes: [],
          tuplets: [],
        });
        this.meters.push(meter);

        startTick += measureTicks;
      }
    });
  }

  private buildMeasures(onsets: Onset[]) {
    if (this.measures.length === 0) {
      return;
    }

    const buckets = this.bucketOnsets(onsets);

    this.measures.forEach((measure, measureIndex) => {
      const meter = this.meters[measureIndex];
      const beatOnsets = buckets[measureIndex];

      if (beatOnsets.every((beat) => beat.length === 0)) {
        measure.notes = [
          {
            notes: [REST_KEY],
            duration: 'w',
            dots: 0,
            isRest: true,
            tick: measure.startTick,
          },
        ];
        measure.tuplets = [];
        return;
      }

      const { notes, tuplets } = this.buildMeasureNotes(
        measure,
        meter,
        beatOnsets,
      );
      measure.notes = notes;
      measure.tuplets = tuplets;
    });
  }

  /**
   * Distribute onsets into [measure][beat] buckets. An onset within a small
   * tolerance before a beat boundary belongs to the next beat — that catches
   * negative humanization jitter at beat and measure boundaries.
   */
  private bucketOnsets(onsets: Onset[]): Onset[][][] {
    const buckets = this.measures.map((_, measureIndex) =>
      new Array(this.meters[measureIndex].beatsPerMeasure)
        .fill(null)
        .map(() => [] as Onset[]),
    );

    onsets.forEach((onset) => {
      const { measureIndex, beatIndex } = this.findBeat(onset.tick);
      buckets[measureIndex][beatIndex].push(onset);
    });

    return buckets;
  }

  private findBeat(tick: number): BeatLocation {
    let low = 0;
    let high = this.measures.length - 1;
    let measureIndex = this.measures.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.measures[mid].startTick <= tick) {
        measureIndex = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const measure = this.measures[measureIndex];
    const meter = this.meters[measureIndex];
    let beatIndex = Math.min(
      meter.beatsPerMeasure - 1,
      Math.max(0, Math.floor((tick - measure.startTick) / meter.beatTicks)),
    );

    const beatEnd = measure.startTick + (beatIndex + 1) * meter.beatTicks;
    if (beatEnd - tick <= meter.beatTicks / 32) {
      if (beatIndex + 1 < meter.beatsPerMeasure) {
        beatIndex += 1;
      } else if (measureIndex + 1 < this.measures.length) {
        return { measureIndex: measureIndex + 1, beatIndex: 0 };
      }
    }

    return { measureIndex, beatIndex };
  }

  private buildMeasureNotes(
    measure: Measure,
    meter: Meter,
    beatOnsets: Onset[][],
  ): { notes: Note[]; tuplets: TupletMeta[] } {
    const notes: Note[] = [];
    const tuplets: TupletMeta[] = [];
    let beatIndex = 0;

    while (beatIndex < meter.beatsPerMeasure) {
      if (beatOnsets[beatIndex].length === 0) {
        let run = 1;
        while (
          beatIndex + run < meter.beatsPerMeasure &&
          beatOnsets[beatIndex + run].length === 0
        ) {
          run += 1;
        }

        // Collapse the run of silent beats into as few rests as the meter
        // allows. Dotted rests read poorly in simple meters but are the norm
        // in compound ones.
        let slot = beatIndex;
        chunkSpan(beatIndex, run, meter.beatFraction, meter.isCompound).forEach(
          (size) => {
            const named = namedDuration(size * meter.beatFraction);
            if (named) {
              notes.push({
                notes: [REST_KEY],
                duration: named.duration,
                dots: named.dots,
                isRest: true,
                tick: Math.round(measure.startTick + slot * meter.beatTicks),
              });
            }
            slot += size;
          },
        );

        beatIndex += run;
      } else {
        const beatStart = measure.startTick + beatIndex * meter.beatTicks;
        const resolved = resolveNearCoincidence(
          beatOnsets[beatIndex],
          beatStart,
          meter.beatTicks,
        );
        const fit = this.fitSpan(
          resolved,
          beatStart,
          meter.beatTicks,
          meter.beatFraction,
          meter.isCompound,
          true,
        );
        notes.push(...fit.events);
        tuplets.push(...fit.tuplets);
        beatIndex += 1;
      }
    }

    return { notes, tuplets };
  }

  /**
   * Notate the onsets of one beat (or half-beat): pick the best-fitting
   * subdivision grid and turn it into notes/rests, optionally preferring an
   * independent fit of each half of the span.
   */
  private fitSpan(
    onsets: Onset[],
    startTick: number,
    durationTicks: number,
    fraction: number,
    isCompound: boolean,
    allowSplit: boolean,
  ): SpanFit {
    if (onsets.length === 0) {
      const named = namedDuration(fraction) ?? { duration: 'q', dots: 0 };
      return {
        score: 0,
        events: [
          {
            notes: [REST_KEY],
            duration: named.duration,
            dots: named.dots,
            isRest: true,
            tick: Math.round(startTick),
          },
        ],
        tuplets: [],
      };
    }

    const candidates = isCompound ? COMPOUND_GRIDS : SIMPLE_GRIDS;
    // The near-coincidence resolver guarantees every onset sits in a distinct
    // MAX_DIVISIONS slot, so the finest grid always separates them and pickGrid
    // cannot fail. No more merge-to-fit fallback (which dropped notes).
    const fit = pickGrid(
      onsets,
      startTick,
      durationTicks,
      fraction,
      candidates,
    ) ?? {
      candidate: candidates[candidates.length - 1],
      score: 0,
      slots: onsets.map((_, i) => i),
    };

    let result = this.buildSpanEvents(
      fit,
      onsets,
      startTick,
      durationTicks,
      fraction,
    );

    if (
      allowSplit &&
      !isCompound &&
      onsets.length > 1 &&
      namedDuration(fraction / 2)
    ) {
      const mid = startTick + durationTicks / 2;
      const tolerance = durationTicks / 32;
      const left = onsets.filter((onset) => mid - onset.tick > tolerance);
      const right = onsets.filter((onset) => mid - onset.tick <= tolerance);

      const leftFit = this.fitSpan(
        left,
        startTick,
        durationTicks / 2,
        fraction / 2,
        false,
        false,
      );
      const rightFit = this.fitSpan(
        right,
        mid,
        durationTicks / 2,
        fraction / 2,
        false,
        false,
      );
      const splitScore = (leftFit.score + rightFit.score) / 2 + SPLIT_PENALTY;

      if (splitScore < result.score) {
        result = {
          score: splitScore,
          events: [...leftFit.events, ...rightFit.events],
          tuplets: [...leftFit.tuplets, ...rightFit.tuplets],
        };
      }
    }

    return result;
  }

  private buildSpanEvents(
    fit: GridFit,
    onsets: Onset[],
    startTick: number,
    durationTicks: number,
    fraction: number,
  ): SpanFit {
    const { candidate, slots } = fit;
    const spacing = durationTicks / candidate.divisions;
    const slotFraction = fraction / candidate.notatedDivisor;

    const occupants = new Map<number, Onset>();
    slots.forEach((slot, index) => occupants.set(slot, onsets[index]));

    const boundaries = [...new Set([0, ...slots])].sort((a, b) => a - b);
    const events: Note[] = [];

    boundaries.forEach((boundary, index) => {
      const next = boundaries[index + 1] ?? candidate.divisions;
      const onset = occupants.get(boundary);
      let slot = boundary;

      chunkSpan(boundary, next - boundary, slotFraction, true).forEach(
        (size, chunkIndex) => {
          const named = namedDuration(size * slotFraction);
          if (named) {
            const isRest = !onset || chunkIndex > 0;
            events.push({
              notes: isRest ? [REST_KEY] : sortKeys(onset.keys),
              duration: named.duration,
              dots: named.dots,
              isRest,
              tick: Math.round(startTick + slot * spacing),
              graceNotes: isRest ? undefined : onset.graceNotes,
            });
          }
          slot += size;
        },
      );
    });

    const tuplets: TupletMeta[] = [];
    if (candidate.tuplet && events.length > 1) {
      const id = this.nextTupletId;
      this.nextTupletId += 1;
      events.forEach((event) => {
        event.tupletId = id;
      });
      tuplets.push({
        id,
        numNotes: candidate.tuplet.numNotes,
        notesOccupied: candidate.tuplet.notesOccupied,
      });
    }

    return { score: fit.score, events, tuplets };
  }
}
