import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lastReply, makeEvent } from './test-support';

const userDataHolder = vi.hoisted(() => ({ current: '' }));
const spawnHolder = vi.hoisted(() => ({
  procs: [] as FakeProc[],
}));

interface FakeProc {
  on: (event: string, cb: (...args: unknown[]) => void) => FakeProc;
  emit: (event: string, ...args: unknown[]) => void;
}

vi.mock('electron', () => ({
  app: { getPath: () => userDataHolder.current },
}));

vi.mock('child_process', () => {
  const spawn = vi.fn(() => {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const proc: FakeProc = {
      on(event, cb) {
        (listeners[event] ??= []).push(cb);

        return proc;
      },
      emit(event, ...args) {
        (listeners[event] ?? []).forEach((cb) => cb(...args));
      },
    };

    spawnHolder.procs.push(proc);

    return proc;
  });

  return { spawn, default: { spawn } };
});

const { downloadStemTools } = await import('./downloadStemTools');

function fakeResponse(
  chunks: Uint8Array[],
  { ok = true, status = 200, contentLength = 0 } = {},
) {
  let index = 0;

  return {
    ok,
    status,
    headers: { get: () => (contentLength ? String(contentLength) : null) },
    body: {
      getReader: () => ({
        read: () =>
          index < chunks.length
            ? Promise.resolve({ done: false, value: chunks[index++] })
            : Promise.resolve({ done: true, value: undefined }),
      }),
    },
  };
}

async function waitForProc() {
  await vi.waitFor(() => expect(spawnHolder.procs.length).toBeGreaterThan(0));

  return spawnHolder.procs[0];
}

describe('downloadStemTools', () => {
  beforeEach(() => {
    userDataHolder.current = fs.mkdtempSync(path.join(os.tmpdir(), 'stem-'));
    spawnHolder.procs = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(userDataHolder.current, { recursive: true, force: true });
  });

  it('streams the download, extracts it and reports success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          fakeResponse([new Uint8Array(50), new Uint8Array(50)], {
            contentLength: 100,
          }),
        ),
      ),
    );

    const event = makeEvent();
    const done = downloadStemTools(event as never);
    const proc = await waitForProc();

    proc.emit('close', 0);
    await done;

    const progresses = event.replies
      .filter((r) => r.channel === 'download-stem-tools')
      .map((r) => (r.args[0] as { progress?: number }).progress)
      .filter((p): p is number => typeof p === 'number');

    expect(progresses).toEqual([45, 90]);
    expect(lastReply(event, 'download-stem-tools')!.args[0]).toEqual({
      success: true,
    });
  });

  it('reports failure when the download response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(fakeResponse([], { ok: false, status: 503 })),
      ),
    );

    const event = makeEvent();

    await downloadStemTools(event as never);

    const reply = lastReply(event, 'download-stem-tools')!.args[0] as {
      success: boolean;
      error: string;
    };

    expect(reply.success).toBe(false);
    expect(reply.error).toContain('503');
  });

  it('reports failure when extraction exits non-zero', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(fakeResponse([new Uint8Array(10)]))),
    );

    const event = makeEvent();
    const done = downloadStemTools(event as never);
    const proc = await waitForProc();

    proc.emit('close', 1);
    await done;

    const reply = lastReply(event, 'download-stem-tools')!.args[0] as {
      success: boolean;
      error: string;
    };

    expect(reply.success).toBe(false);
    expect(reply.error).toContain('Extraction failed');
  });
});
