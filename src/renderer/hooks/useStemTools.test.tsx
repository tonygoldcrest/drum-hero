import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getNotification,
  installIpcMock,
  IpcMock,
  NotificationMock,
  resetNotification,
} from './test-support';

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();

  return {
    ...actual,
    App: Object.assign({}, actual.App, {
      useApp: () => ({ notification: getNotification() }),
    }),
  };
});

let ipc: IpcMock;
let notification: NotificationMock;

beforeEach(async () => {
  ipc = installIpcMock();
  notification = resetNotification();
});

async function load() {
  const { useStemTools } = await import('./useStemTools');

  return renderHook(() => useStemTools());
}

describe('useStemTools', () => {
  it('checks stem tools on mount and starts ready', async () => {
    const { result } = await load();

    expect(ipc.sent).toEqual([{ channel: 'check-stem-tools', args: [] }]);
    expect(ipc.onceCount('check-stem-tools')).toBe(1);
    expect(result.current.stemToolsStatus).toBe('ready');
  });

  it('applies the status returned by the check', async () => {
    const { result } = await load();

    act(() => ipc.emit('check-stem-tools', { status: 'unsupported' }));

    expect(result.current.stemToolsStatus).toBe('unsupported');
  });

  it('exposes the installed version and checks for updates when ready', async () => {
    const { result } = await load();

    act(() =>
      ipc.emit('check-stem-tools', {
        status: 'ready',
        installedVersion: '1.0.0',
      }),
    );

    expect(result.current.installedVersion).toBe('1.0.0');
    expect(ipc.sent).toContainEqual({
      channel: 'check-stem-tools-update',
      args: [],
    });

    act(() =>
      ipc.emit('check-stem-tools-update', {
        available: true,
        latestVersion: '1.1.0',
        updateAvailable: true,
        downloadSize: 280_000_000,
        uncompressedSize: 700_000_000,
      }),
    );

    expect(result.current.updateAvailable).toBe(true);
    expect(result.current.latestVersion).toBe('1.1.0');
    expect(result.current.available).toBe(true);
    expect(result.current.downloadSize).toBe(280_000_000);
    expect(result.current.uncompressedSize).toBe(700_000_000);
  });

  it('fetches remote info and sizes even when not installed', async () => {
    const { result } = await load();

    act(() => ipc.emit('check-stem-tools', { status: 'download' }));

    expect(ipc.sent).toContainEqual({
      channel: 'check-stem-tools-update',
      args: [],
    });

    act(() =>
      ipc.emit('check-stem-tools-update', {
        available: true,
        updateAvailable: false,
        downloadSize: 280_000_000,
        uncompressedSize: 700_000_000,
      }),
    );

    expect(result.current.available).toBe(true);
    expect(result.current.downloadSize).toBe(280_000_000);
  });

  it('marks tools unavailable when the remote fetch fails', async () => {
    const { result } = await load();

    act(() => ipc.emit('check-stem-tools', { status: 'download' }));
    act(() =>
      ipc.emit('check-stem-tools-update', {
        available: false,
        updateAvailable: false,
      }),
    );

    expect(result.current.available).toBe(false);
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('tracks the download phase alongside progress', async () => {
    const { result } = await load();

    act(() =>
      ipc.emit('download-stem-tools', { phase: 'downloading', progress: 20 }),
    );
    expect(result.current.phase).toBe('downloading');

    act(() =>
      ipc.emit('download-stem-tools', { phase: 'extracting', progress: 60 }),
    );
    expect(result.current.phase).toBe('extracting');
    expect(result.current.downloadPercent).toBe(60);
  });

  it('clears loading without an error when cancelled', async () => {
    const { result } = await load();

    act(() => result.current.download());
    act(() => ipc.emit('download-stem-tools', { cancelled: true }));

    expect(result.current.stemToolsLoading).toBe(false);
    expect(result.current.downloadPercent).toBeUndefined();
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('sends a cancel request', async () => {
    const { result } = await load();

    act(() => result.current.cancel());

    expect(ipc.sent).toContainEqual({
      channel: 'cancel-stem-tools',
      args: [],
    });
  });

  it('flips back to download after deletion', async () => {
    const { result } = await load();

    act(() =>
      ipc.emit('check-stem-tools', {
        status: 'ready',
        installedVersion: '1.0.0',
      }),
    );

    act(() => result.current.deleteTools());
    expect(ipc.sent).toContainEqual({
      channel: 'delete-stem-tools',
      args: [],
    });

    act(() => ipc.emit('delete-stem-tools', { success: true }));

    expect(result.current.stemToolsStatus).toBe('download');
    expect(result.current.installedVersion).toBeUndefined();
  });

  it('sets loading and sends a request on download', async () => {
    const { result } = await load();

    act(() => result.current.download());

    expect(result.current.stemToolsLoading).toBe(true);
    expect(ipc.sent).toContainEqual({
      channel: 'download-stem-tools',
      args: [],
    });
  });

  it('reports download progress including zero percent', async () => {
    const { result } = await load();

    act(() => ipc.emit('download-stem-tools', { progress: 0 }));
    expect(result.current.downloadPercent).toBe(0);

    act(() => ipc.emit('download-stem-tools', { progress: 42 }));
    expect(result.current.downloadPercent).toBe(42);
  });

  it('completes successfully, clearing progress and loading', async () => {
    const { result } = await load();

    act(() => result.current.download());
    act(() => ipc.emit('download-stem-tools', { progress: 50 }));
    act(() => ipc.emit('download-stem-tools', { success: true }));

    expect(result.current.downloadPercent).toBeUndefined();
    expect(result.current.stemToolsLoading).toBe(false);
    expect(result.current.stemToolsStatus).toBe('ready');
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('surfaces a notification on download error', async () => {
    const { result } = await load();

    act(() => result.current.download());
    act(() => ipc.emit('download-stem-tools', { error: 'boom' }));

    expect(notification.error).toHaveBeenCalledTimes(1);
    expect(notification.error.mock.calls[0][0]).toMatchObject({
      description: 'boom',
    });
    expect(result.current.stemToolsLoading).toBe(false);
    expect(result.current.downloadPercent).toBeUndefined();
  });

  it('does not flip to ready when the download fails', async () => {
    const { result } = await load();

    act(() => ipc.emit('check-stem-tools', { status: 'unsupported' }));
    act(() => ipc.emit('download-stem-tools', { error: 'boom' }));

    expect(result.current.stemToolsStatus).toBe('unsupported');
  });

  it('unsubscribes from download updates on unmount', async () => {
    const { unmount } = await load();

    expect(ipc.onCount('download-stem-tools')).toBe(1);

    unmount();

    expect(ipc.onCount('download-stem-tools')).toBe(0);
  });
});
