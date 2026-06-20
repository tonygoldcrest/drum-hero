import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MidiMapping, MidiMessageType } from '../../types';
import { installIpcMock, IpcMock } from '../hooks/test-support';
import { MidiConfigModal } from './MidiConfigModal';

const { settings } = vi.hoisted(() => ({
  settings: {
    selectedDevice: { port: 1, name: 'Pad' } as {
      port: number;
      name: string;
    } | null,
    setSelectedDevice: vi.fn(),
    midiMapping: {
      snare: [38],
      kick: [],
      hihat: [],
      ride: [],
      crash: [],
      tom1: [],
      tom2: [],
      tom3: [],
    } as MidiMapping,
    assignNote: vi.fn(),
    removeNote: vi.fn(),
  },
}));

vi.mock('../context/AppContext', () => ({
  useApp: () => settings,
}));

let ipc: IpcMock;

beforeEach(() => {
  ipc = installIpcMock();
  settings.assignNote.mockClear();
  settings.removeNote.mockClear();
  (
    HTMLElement.prototype as unknown as { showPopover: () => void }
  ).showPopover = vi.fn();
  (
    HTMLElement.prototype as unknown as { hidePopover: () => void }
  ).hidePopover = vi.fn();
});

function sentChannels() {
  return ipc.sent.map((s) => s.channel);
}

describe('MidiConfigModal', () => {
  it('does not stop the shared midi stream when it closes', () => {
    const { rerender } = render(<MidiConfigModal isOpen onClose={() => {}} />);

    act(() => {
      rerender(<MidiConfigModal isOpen={false} onClose={() => {}} />);
    });

    expect(sentChannels()).not.toContain('stop-listen-midi');
  });

  it('does not manage the shared midi stream lifecycle itself', () => {
    const { rerender } = render(<MidiConfigModal isOpen onClose={() => {}} />);

    act(() => {
      rerender(<MidiConfigModal isOpen={false} onClose={() => {}} />);
    });

    expect(sentChannels()).not.toContain('listen-midi');
    expect(sentChannels()).not.toContain('stop-listen-midi');
  });

  it('ignores incoming notes until an element is in learn mode', () => {
    render(<MidiConfigModal isOpen onClose={() => {}} />);

    act(() =>
      ipc.emit('listen-midi', {
        type: MidiMessageType.NoteOn,
        note: 50,
        velocity: 100,
      }),
    );

    expect(settings.assignNote).not.toHaveBeenCalled();
  });

  it('assigns the next learned note to the chosen element', () => {
    render(<MidiConfigModal isOpen onClose={() => {}} />);

    fireEvent.click(screen.getAllByText('Learn')[0]);

    act(() =>
      ipc.emit('listen-midi', {
        type: MidiMessageType.NoteOn,
        note: 50,
        velocity: 100,
      }),
    );

    expect(settings.assignNote).toHaveBeenCalledWith('hihat', 50);
  });
});
