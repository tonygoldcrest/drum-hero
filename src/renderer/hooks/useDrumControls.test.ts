import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MidiDevice, MidiMapping, MidiMessageType } from '../../types';
import { installIpcMock, IpcMock } from './test-support';
import { DrumControlHandlers, useDrumControls } from './useDrumControls';

let ipc: IpcMock;
const DEVICE: MidiDevice = { port: 1, name: 'Pad' };

interface Props {
  device: MidiDevice | null;
  mapping: MidiMapping;
  handlers: DrumControlHandlers;
  enabled?: boolean;
}

function setup(initial: Props) {
  return renderHook(
    ({ device, mapping, handlers, enabled = true }: Props) =>
      useDrumControls(device, mapping, handlers, enabled),
    { initialProps: initial },
  );
}

function noteOn(note: number, velocity = 100) {
  act(() =>
    ipc.emit('listen-midi', {
      type: MidiMessageType.NoteOn,
      note,
      velocity,
    }),
  );
}

beforeEach(() => {
  ipc = installIpcMock();
});

describe('useDrumControls', () => {
  it('does not listen without a selected device', () => {
    setup({ device: null, mapping: { snare: [38] }, handlers: {} });

    expect(ipc.onCount('listen-midi')).toBe(0);
  });

  it('listens while a device is selected and stops on unmount', () => {
    const { unmount } = setup({
      device: DEVICE,
      mapping: { snare: [38] },
      handlers: {},
    });

    expect(ipc.onCount('listen-midi')).toBe(1);

    unmount();

    expect(ipc.onCount('listen-midi')).toBe(0);
  });

  it('invokes the handler mapped to the incoming note', () => {
    const snare = vi.fn();

    setup({
      device: DEVICE,
      mapping: { snare: [38], kick: [36] },
      handlers: { snare },
    });

    noteOn(38);

    expect(snare).toHaveBeenCalledTimes(1);
  });

  it('routes different notes to their own handlers', () => {
    const snare = vi.fn();
    const kick = vi.fn();

    setup({
      device: DEVICE,
      mapping: { snare: [38], kick: [36] },
      handlers: { snare, kick },
    });

    noteOn(36);

    expect(kick).toHaveBeenCalledTimes(1);
    expect(snare).not.toHaveBeenCalled();
  });

  it('does nothing for an unmapped note', () => {
    const snare = vi.fn();

    setup({
      device: DEVICE,
      mapping: { snare: [38] },
      handlers: { snare },
    });

    noteOn(99);

    expect(snare).not.toHaveBeenCalled();
  });

  it('does nothing when no handler is registered for the element', () => {
    setup({
      device: DEVICE,
      mapping: { snare: [38] },
      handlers: {},
    });

    expect(() => noteOn(38)).not.toThrow();
  });

  it('ignores note-on messages with zero velocity', () => {
    const snare = vi.fn();

    setup({
      device: DEVICE,
      mapping: { snare: [38] },
      handlers: { snare },
    });

    noteOn(38, 0);

    expect(snare).not.toHaveBeenCalled();
  });

  it('ignores note-off messages', () => {
    const snare = vi.fn();

    setup({
      device: DEVICE,
      mapping: { snare: [38] },
      handlers: { snare },
    });

    act(() =>
      ipc.emit('listen-midi', {
        type: MidiMessageType.NoteOff,
        note: 38,
        velocity: 100,
      }),
    );

    expect(snare).not.toHaveBeenCalled();
  });

  it('ignores hits while disabled', () => {
    const snare = vi.fn();

    setup({
      device: DEVICE,
      mapping: { snare: [38] },
      handlers: { snare },
      enabled: false,
    });

    noteOn(38);

    expect(snare).not.toHaveBeenCalled();
  });

  it('reacts to the enabled flag changing without resubscribing', () => {
    const snare = vi.fn();
    const { rerender } = setup({
      device: DEVICE,
      mapping: { snare: [38] },
      handlers: { snare },
      enabled: false,
    });

    noteOn(38);
    expect(snare).not.toHaveBeenCalled();

    rerender({
      device: DEVICE,
      mapping: { snare: [38] },
      handlers: { snare },
      enabled: true,
    });

    expect(ipc.onCount('listen-midi')).toBe(1);

    noteOn(38);
    expect(snare).toHaveBeenCalledTimes(1);
  });

  it('uses the latest handlers without resubscribing', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = setup({
      device: DEVICE,
      mapping: { snare: [38] },
      handlers: { snare: first },
    });

    rerender({
      device: DEVICE,
      mapping: { snare: [38] },
      handlers: { snare: second },
    });

    noteOn(38);

    expect(ipc.onCount('listen-midi')).toBe(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('uses the latest mapping without resubscribing', () => {
    const snare = vi.fn();
    const { rerender } = setup({
      device: DEVICE,
      mapping: { snare: [38] },
      handlers: { snare },
    });

    rerender({
      device: DEVICE,
      mapping: { snare: [40] },
      handlers: { snare },
    });

    noteOn(38);
    expect(snare).not.toHaveBeenCalled();

    noteOn(40);
    expect(snare).toHaveBeenCalledTimes(1);
    expect(ipc.onCount('listen-midi')).toBe(1);
  });
});
