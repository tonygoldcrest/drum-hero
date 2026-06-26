import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputMapping } from '../../types';
import { InputEvent } from '../input/types';
import { installIpcMock, IpcMock } from '../hooks/test-support';
import { InputConfigModal } from './InputConfigModal';

const { settings, busListeners, listDevicesMock } = vi.hoisted(() => ({
  settings: {
    selectedDevice: {
      id: 'midi:Pad',
      name: 'Pad',
      sourceId: 'midi',
      port: 1,
    } as {
      id: string;
      name: string;
      sourceId: string;
      port?: number;
    } | null,
    setSelectedDevice: vi.fn(),
    inputMapping: {
      snare: ['midi:38'],
      kick: [],
      hihat: [],
      ride: [],
      crash: [],
      tom1: [],
      tom2: [],
      tom3: [],
    } as InputMapping,
    assignControl: vi.fn(),
    removeControl: vi.fn(),
  },
  busListeners: new Set<(event: InputEvent) => void>(),
  listDevicesMock: vi.fn(),
}));

vi.mock('../context/AppContext', () => ({
  useApp: () => settings,
}));

vi.mock('../input', () => ({
  inputBus: {
    subscribe: (listener: (event: InputEvent) => void) => {
      busListeners.add(listener);

      return () => {
        busListeners.delete(listener);
      };
    },
    listDevices: () => listDevicesMock(),
  },
  controlSource: (id: string) => id.slice(0, id.indexOf(':')),
  controlLabel: (id: string) => id.slice(id.indexOf(':') + 1),
}));

let ipc: IpcMock;

function press(controlId: string) {
  act(() =>
    busListeners.forEach((listener) => listener({ controlId, value: 100 })),
  );
}

beforeEach(() => {
  ipc = installIpcMock();
  settings.assignControl.mockClear();
  settings.removeControl.mockClear();
  settings.setSelectedDevice.mockClear();
  listDevicesMock.mockResolvedValue([
    { id: 'midi:Pad', name: 'Pad', sourceId: 'midi', port: 1 },
  ]);
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

describe('InputConfigModal', () => {
  it('does not manage the shared midi stream lifecycle itself', () => {
    const { rerender } = render(<InputConfigModal isOpen onClose={() => {}} />);

    act(() => {
      rerender(<InputConfigModal isOpen={false} onClose={() => {}} />);
    });

    expect(sentChannels()).not.toContain('listen-midi');
    expect(sentChannels()).not.toContain('stop-listen-midi');
  });

  it('ignores incoming controls until an element is in learn mode', () => {
    render(<InputConfigModal isOpen onClose={() => {}} />);

    press('midi:50');

    expect(settings.assignControl).not.toHaveBeenCalled();
  });

  it('clears the selected device when it is no longer in the device list', async () => {
    listDevicesMock.mockResolvedValue([
      { id: 'midi:Other', name: 'Other Device', sourceId: 'midi', port: 2 },
    ]);

    await act(async () => {
      render(<InputConfigModal isOpen onClose={() => {}} />);
    });

    expect(settings.setSelectedDevice).toHaveBeenCalledWith(null);
  });

  it('keeps the selected device when it is still in the device list', async () => {
    await act(async () => {
      render(<InputConfigModal isOpen onClose={() => {}} />);
    });

    expect(settings.setSelectedDevice).not.toHaveBeenCalledWith(null);
  });

  it('assigns the next learned control to the chosen element', () => {
    render(<InputConfigModal isOpen onClose={() => {}} />);

    fireEvent.click(screen.getAllByText('Learn')[0]);

    press('midi:50');

    expect(settings.assignControl).toHaveBeenCalledWith('hihat', 'midi:50');
  });
});
