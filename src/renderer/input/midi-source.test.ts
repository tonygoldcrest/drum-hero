import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MidiDevice, MidiMessageType } from '../../types';
import { installIpcMock, IpcMock } from '../hooks/test-support';
import { MidiSource } from './midi-source';
import { InputEvent } from './types';

describe('MidiSource', () => {
  let ipc: IpcMock;

  beforeEach(() => {
    ipc = installIpcMock();
  });

  afterEach(() => {
    delete (window as unknown as { electron?: unknown }).electron;
  });

  function listen(): InputEvent[] {
    const events: InputEvent[] = [];

    new MidiSource().start((event) => events.push(event));

    return events;
  }

  it('emits a namespaced control event for a NoteOn message', () => {
    const events = listen();

    ipc.emit('listen-midi', {
      type: MidiMessageType.NoteOn,
      note: 38,
      velocity: 100,
    });

    expect(events).toEqual([{ controlId: 'midi:38', value: 100 }]);
  });

  it('ignores NoteOff and zero-velocity (note-off-style) messages', () => {
    const events = listen();

    ipc.emit('listen-midi', {
      type: MidiMessageType.NoteOff,
      note: 38,
      velocity: 100,
    });
    ipc.emit('listen-midi', {
      type: MidiMessageType.NoteOn,
      note: 38,
      velocity: 0,
    });

    expect(events).toEqual([]);
  });

  it('requests and maps the device list into namespaced devices', async () => {
    const promise = new MidiSource().listDevices();
    const devices: MidiDevice[] = [
      { name: 'Pad', port: 0 },
      { name: 'Kit', port: 1 },
    ];

    ipc.emit('midi-device-list', devices);

    await expect(promise).resolves.toEqual([
      { id: 'midi:Pad', name: 'Pad', sourceId: 'midi', port: 0 },
      { id: 'midi:Kit', name: 'Kit', sourceId: 'midi', port: 1 },
    ]);
    expect(ipc.sent).toContainEqual({ channel: 'midi-device-list', args: [] });
  });
});
