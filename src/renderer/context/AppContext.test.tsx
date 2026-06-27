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

describe('AppContext input mapping', () => {
  it('ignores control assignment when no device is selected', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.assignControl('snare', 'midi:38'));

    expect(result.current.inputMapping.snare).toEqual([]);
  });

  it('assigns a control to the selected device element', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setSelectedDevice(DEVICE_A));
    act(() => result.current.assignControl('snare', 'midi:38'));

    expect(result.current.inputMapping.snare).toEqual(['midi:38']);
  });

  it('does not duplicate a control already bound to the element', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setSelectedDevice(DEVICE_A));
    act(() => result.current.assignControl('snare', 'midi:38'));
    act(() => result.current.assignControl('snare', 'midi:38'));

    expect(result.current.inputMapping.snare).toEqual(['midi:38']);
  });

  it('moves a control off other elements when reassigned', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setSelectedDevice(DEVICE_A));
    act(() => result.current.assignControl('snare', 'midi:38'));
    act(() => result.current.assignControl('kick', 'midi:38'));

    expect(result.current.inputMapping.snare).toEqual([]);
    expect(result.current.inputMapping.kick).toEqual(['midi:38']);
  });

  it('removes a bound control from an element', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setSelectedDevice(DEVICE_A));
    act(() => result.current.assignControl('snare', 'midi:38'));
    act(() => result.current.removeControl('snare', 'midi:38'));

    expect(result.current.inputMapping.snare).toEqual([]);
  });

  it('keeps mappings separate per device', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setSelectedDevice(DEVICE_A));
    act(() => result.current.assignControl('snare', 'midi:38'));
    act(() => result.current.setSelectedDevice(DEVICE_B));

    expect(result.current.inputMapping.snare).toEqual([]);
  });
});

const KEYBOARD: InputDevice = {
  id: 'keyboard',
  name: 'Keyboard',
  sourceId: 'keyboard',
};

describe('AppContext keyboard default suppression', () => {
  function dispatchKey(code: string, target?: EventTarget) {
    const event = new KeyboardEvent('keydown', {
      code,
      bubbles: true,
      cancelable: true,
    });

    act(() => {
      if (target) {
        target.dispatchEvent(event);
      } else {
        window.dispatchEvent(event);
      }
    });

    return event;
  }

  function bindSpaceOnKeyboard() {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setSelectedDevice(KEYBOARD));
    act(() => result.current.assignControl('kick', 'keyboard:Space'));

    return result;
  }

  it('suppresses the default action for a bound key', () => {
    bindSpaceOnKeyboard();

    expect(dispatchKey('Space').defaultPrevented).toBe(true);
  });

  it('leaves unbound keys alone', () => {
    bindSpaceOnKeyboard();

    expect(dispatchKey('KeyZ').defaultPrevented).toBe(false);
  });

  it('does not suppress while typing in an input', () => {
    bindSpaceOnKeyboard();

    const input = document.createElement('input');

    document.body.append(input);

    expect(dispatchKey('Space', input).defaultPrevented).toBe(false);

    input.remove();
  });

  it('does not suppress when a non-keyboard device is selected', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setSelectedDevice(DEVICE_A));

    expect(dispatchKey('Space').defaultPrevented).toBe(false);
  });
});

describe('AppContext settings', () => {
  it('defaults showReference to on', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.showReference).toBe(true);
  });

  it('persists showReference when toggled off', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.setShowReference(false));

    expect(result.current.showReference).toBe(false);
    expect(window.localStorage.getItem('settings.showReference')).toBe('false');
  });
});

describe('useApp', () => {
  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useApp())).toThrow(
      'useApp must be used within AppProvider',
    );
  });
});
