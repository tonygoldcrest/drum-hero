import { Midi } from '@tonejs/midi';

export const PPQ = 480;

export const GEM = {
  kick: 96,
  snare: 97,
  yellow: 98, // yellow cymbal
  blue: 99, // blue cymbal
  green: 100, // green cymbal
};

export const TOM_MARKER = {
  yellow: 110,
  blue: 111,
  green: 112,
};

export interface Hit {
  pitch: number;
  tick: number;
  durationTicks?: number;
}

export interface MeasureSpec {
  timeSig?: [number, number];
  hits: Hit[];
}

export function hit(pitch: number, tick: number, durationTicks = 1): Hit {
  return { pitch, tick, durationTicks };
}

export function tom(
  marker: number,
  gemPitch: number,
  tick: number,
  span = 120,
): Hit[] {
  return [
    { pitch: gemPitch, tick },
    { pitch: marker, tick, durationTicks: span },
  ];
}

function measureTicksFor([numerator, denominator]: [number, number]): number {
  return numerator * ((PPQ * 4) / denominator);
}

export function buildDrumMidi(measures: MeasureSpec[]): Uint8Array {
  const midi = new Midi();
  const track = midi.addTrack();

  track.name = 'PART DRUMS';

  let absStart = 0;
  let prevSig: [number, number] = [4, 4];

  measures.forEach((measure, index) => {
    const sig = measure.timeSig ?? prevSig;

    if (index === 0 || sig[0] !== prevSig[0] || sig[1] !== prevSig[1]) {
      midi.header.timeSignatures.push({
        ticks: absStart,
        timeSignature: sig,
      } as never);
    }

    measure.hits.forEach((h) => {
      track.addNote({
        midi: h.pitch,
        ticks: absStart + h.tick,
        durationTicks: h.durationTicks ?? 1,
        velocity: 0.8,
      });
    });
    absStart += measureTicksFor(sig);
    prevSig = sig;
  });
  track.addNote({
    midi: 1,
    ticks: Math.max(0, absStart - 1),
    durationTicks: 1,
    velocity: 0.01,
  });

  return midi.toArray();
}
