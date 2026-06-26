import { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { installIpcMock, IpcMock } from '../hooks/test-support';
import { InputDevice } from '../input';
import { AppProvider, useApp } from './AppContext';

let ipc: IpcMock;

function installLocalStorage() {
  const store = new Map<string, string>();

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

function listenPorts() {
  return ipc.sent
    .filter((s) => s.channel === 'listen-midi')
    .map((s) => s.args[0]);
}

function stopCount() {
  return ipc.sent.filter((s) => s.channel === 'stop-listen-midi').length;
}

beforeEach(() => {
  installLocalStorage();
  ipc = installIpcMock();
});

const DEVICE_A: InputDevice = {
  id: 'midi:Pad A',
  name: 'Pad A',
  sourceId: 'midi',
  port: 2,
};
const DEVICE_B: InputDevice = {
  id: 'midi:Pad B',
  name: 'Pad B',
  sourceId: 'midi',
  port: 5,
};

describe('AppContext midi stream ownership', () => {
  it('does not listen when no device is selected', () => {
    renderHook(() => useApp(), { wrapper });

    expect(listenPorts()).toEqual([]);
  });

  it('starts listening when a device is selected', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setSelectedDevice(DEVICE_A));

    expect(listenPorts()).toEqual([2]);
  });

  it('restarts on the new port when the device changes', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setSelectedDevice(DEVICE_A));
    act(() => result.current.setSelectedDevice(DEVICE_B));

    expect(listenPorts()).toEqual([2, 5]);
    expect(stopCount()).toBe(1);
  });

  it('stops listening when the device is cleared', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setSelectedDevice(DEVICE_A));
    act(() => result.current.setSelectedDevice(null));

    expect(stopCount()).toBe(1);
  });

  it('stops listening on unmount', () => {
    const { result, unmount } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setSelectedDevice(DEVICE_A));
    unmount();

    expect(stopCount()).toBe(1);
  });
});
