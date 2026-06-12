import type { Meta, StoryObj } from '@storybook/react';
import { SheetMusic } from './SheetMusic';
import { Difficulty } from '../../../midi-parser/parser';
import {
  buildDrumMidi,
  hit,
  tom,
  GEM,
  TOM_MARKER,
  Hit,
  MeasureSpec,
} from './drumMidiFixture';

function Sheet({ measures }: { measures: MeasureSpec[] }) {
  return (
    <div style={{ padding: 24, background: '#fff', overflow: 'auto' }}>
      <SheetMusic
        midiData={buildDrumMidi(measures) as unknown as Buffer}
        showBarNumbers
        enableColors
        currentTime={0}
        onSelectMeasure={() => {}}
        difficulty={Difficulty.expert}
        isFiveLane={false}
      />
    </div>
  );
}

function seq(pitch: number, ticks: number[]): Hit[] {
  return ticks.map((t) => hit(pitch, t));
}

const B = 480;
const range = (n: number, step: number) =>
  Array.from({ length: n }, (_, i) => i * step);

const MEASURES: MeasureSpec[] = [
  { hits: seq(GEM.snare, [0, B, 2 * B, 3 * B]) }, // quarters
  { hits: seq(GEM.snare, range(8, 240)) }, // eighths
  { hits: seq(GEM.snare, range(16, 120)) }, // sixteenths
  { hits: seq(GEM.snare, [0, 360, 480, 840, 960, 1320, 1440, 1800]) }, // dotted-8 + 16
  { hits: seq(GEM.snare, [0]) }, // single hit (long-note limitation)

  { hits: seq(GEM.snare, [0]) }, // quarter + half rest
  { hits: seq(GEM.snare, [0, 720]) }, // eighth rest
  { hits: seq(GEM.snare, [720]) }, // dotted-quarter rest on strong beat (currently split)
  { hits: seq(GEM.snare, [120]) }, // sixteenth rest
  { hits: [] }, // whole-measure rest

  { hits: seq(GEM.snare, [0, 160, 320]) }, // eighth-note triplet
  { hits: seq(GEM.snare, [0, 80, 160, 240, 320, 400]) }, // two 16th-triplets (currently 6:4)
  { hits: seq(GEM.snare, [0, 96, 192, 288, 384]) }, // quintuplet
  { hits: seq(GEM.snare, [0, 69, 137, 206, 274, 343, 411]) }, // septuplet
  { hits: seq(GEM.snare, range(12, 40)) }, // twelve even (currently two 6:4)

  { hits: [hit(GEM.snare, 0), hit(GEM.snare, 8), hit(GEM.snare, B)] },
  {
    hits: [
      hit(GEM.snare, 0),
      hit(GEM.snare, 8),
      hit(GEM.snare, 14),
      hit(GEM.snare, B),
    ],
  },
  { hits: [hit(GEM.kick, 0), hit(GEM.snare, 8), hit(GEM.snare, B)] }, // near-coincident kick+snare -> chord
  { hits: seq(GEM.snare, [0, 120, 240, 320, 400]) }, // mixed beat (16ths then 16th-triplet)
  {
    hits: [
      hit(GEM.blue, 160),
      hit(GEM.snare, 300),
      hit(GEM.blue, 300),
      hit(GEM.kick, 450),
      hit(GEM.snare, 450),
      hit(GEM.blue, 450),
      hit(GEM.snare, 600),
      hit(GEM.blue, 600),
      hit(GEM.snare, 750),
      hit(GEM.blue, 750),
      ...seq(GEM.yellow, [1280, 1360, 1440, 1520, 1640]),
    ],
  }, // real off-grid fill (Spinal Tap bar 94)
  {
    hits: [
      hit(GEM.snare, 0),
      ...tom(TOM_MARKER.yellow, GEM.yellow, B),
      ...tom(TOM_MARKER.blue, GEM.blue, 2 * B),
      ...tom(TOM_MARKER.green, GEM.green, 3 * B),
    ],
  }, // toms via pro-drums markers

  { timeSig: [3, 4], hits: seq(GEM.snare, [0, B, 2 * B]) },
  {
    timeSig: [6, 8],
    hits: seq(GEM.snare, [0, 240, 480, 720, 960, 1200]),
  },
  {
    timeSig: [5, 4],
    hits: seq(GEM.snare, [0, B, 2 * B, 3 * B, 4 * B]),
  },
  {
    timeSig: [7, 8],
    hits: seq(GEM.snare, [0, 240, 480, 720, 960, 1200, 1440]),
  },
  { timeSig: [2, 4], hits: seq(GEM.snare, [0, B]) },
];

const meta: Meta<typeof Sheet> = {
  title: 'SheetMusic/Use cases',
  component: Sheet,
};
export default meta;

type Story = StoryObj<typeof Sheet>;

export const AllUseCases: Story = {
  parameters: {
    docs: {
      description: {
        story: [
          'Every measure is a use case (bar numbers shown):',
          '0 quarters · 1 eighths · 2 sixteenths · 3 dotted-eighth+sixteenth · 4 single hit (long notes not produced yet)',
          '5 quarter+half rest · 6 eighth rest · 7 dotted-quarter rest on a strong beat (currently split) · 8 sixteenth rest · 9 whole-measure rest',
          '10 eighth triplet · 11 two 16th-triplets (currently 6:4) · 12 quintuplet · 13 septuplet · 14 twelve even (currently two 6:4)',
          '15 flam · 16 drag · 17 near-coincident kick+snare → chord · 18 mixed beat · 19 real off-grid fill (Spinal Tap bar 94) · 20 toms',
          '21 3/4 · 22 6/8 · 23 5/4 · 24 7/8 · 25 2/4',
        ].join('\n\n'),
      },
    },
  },
  render: () => <Sheet measures={MEASURES} />,
};
