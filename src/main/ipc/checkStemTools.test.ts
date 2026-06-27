import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lastReply, makeEvent } from './test-support';

const userDataHolder = vi.hoisted(() => ({ current: '' }));

vi.mock('electron', () => ({
  app: { getPath: () => userDataHolder.current },
}));

const { checkStemTools, checkStemToolsUpdate } = await import(
  './checkStemTools'
);

function setPlatform(platform: NodeJS.Platform, arch = process.arch) {
  Object.defineProperty(process, 'platform', { value: platform });
  Object.defineProperty(process, 'arch', { value: arch });
}

function installBundle(userData: string, version: string, binary: string) {
  const bundleDir = path.join(userData, 'stem-tools', 'demucs-split');

  fs.mkdirSync(bundleDir, { recursive: true });
  fs.writeFileSync(path.join(bundleDir, binary), '');
  fs.writeFileSync(
    path.join(bundleDir, 'manifest.json'),
    JSON.stringify({ version, fileCount: 1 }),
  );
}

describe('checkStemTools', () => {
  const originalPlatform = process.platform;
  const originalArch = process.arch;
  let userData: string;

  beforeEach(() => {
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'userdata-'));
    userDataHolder.current = userData;
  });

  afterEach(() => {
    setPlatform(originalPlatform, originalArch);
    vi.unstubAllGlobals();
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('reports unsupported on platforms without a stem binary', () => {
    setPlatform('linux', 'x64');

    const event = makeEvent();

    checkStemTools(event as never);

    expect(lastReply(event, 'check-stem-tools')!.args[0]).toEqual({
      status: 'unsupported',
    });
  });

  it('reports download when supported but nothing is installed', () => {
    setPlatform('darwin', 'arm64');

    const event = makeEvent();

    checkStemTools(event as never);

    expect(lastReply(event, 'check-stem-tools')!.args[0]).toEqual({
      status: 'download',
    });
  });

  it('reports download when the binary exists but the manifest is missing', () => {
    setPlatform('darwin', 'arm64');

    const bundleDir = path.join(userData, 'stem-tools', 'demucs-split');

    fs.mkdirSync(bundleDir, { recursive: true });
    fs.writeFileSync(path.join(bundleDir, 'demucs-split'), '');

    const event = makeEvent();

    checkStemTools(event as never);

    expect(lastReply(event, 'check-stem-tools')!.args[0]).toEqual({
      status: 'download',
    });
  });

  it('reports ready with the installed version on macOS', () => {
    setPlatform('darwin', 'arm64');
    installBundle(userData, '1.2.0', 'demucs-split');

    const event = makeEvent();

    checkStemTools(event as never);

    expect(lastReply(event, 'check-stem-tools')!.args[0]).toEqual({
      status: 'ready',
      installedVersion: '1.2.0',
    });
  });

  it('looks for the .exe binary on Windows', () => {
    setPlatform('win32', 'x64');
    installBundle(userData, '1.2.0', 'demucs-split.exe');

    const event = makeEvent();

    checkStemTools(event as never);

    expect(lastReply(event, 'check-stem-tools')!.args[0]).toEqual({
      status: 'ready',
      installedVersion: '1.2.0',
    });
  });
});

describe('checkStemToolsUpdate', () => {
  const originalPlatform = process.platform;
  const originalArch = process.arch;
  let userData: string;

  beforeEach(() => {
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'userdata-'));
    userDataHolder.current = userData;
    setPlatform('darwin', 'arm64');
  });

  afterEach(() => {
    setPlatform(originalPlatform, originalArch);
    vi.unstubAllGlobals();
    fs.rmSync(userData, { recursive: true, force: true });
  });

  function stubManifest(manifest: unknown) {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) }),
      ),
    );
  }

  const remote = {
    version: '1.1.0',
    fileCount: 10,
    downloadSize: 280_000_000,
    uncompressedSize: 700_000_000,
  };

  it('reports availability and sizes with no update when nothing is installed', async () => {
    stubManifest(remote);

    const event = makeEvent();

    await checkStemToolsUpdate(event as never);

    expect(lastReply(event, 'check-stem-tools-update')!.args[0]).toEqual({
      available: true,
      latestVersion: '1.1.0',
      downloadSize: 280_000_000,
      uncompressedSize: 700_000_000,
      updateAvailable: false,
    });
  });

  it('flags an update when the remote version differs', async () => {
    installBundle(userData, '1.0.0', 'demucs-split');
    stubManifest(remote);

    const event = makeEvent();

    await checkStemToolsUpdate(event as never);

    expect(lastReply(event, 'check-stem-tools-update')!.args[0]).toMatchObject({
      available: true,
      latestVersion: '1.1.0',
      updateAvailable: true,
    });
  });

  it('reports no update when the installed version matches the remote', async () => {
    installBundle(userData, '1.1.0', 'demucs-split');
    stubManifest(remote);

    const event = makeEvent();

    await checkStemToolsUpdate(event as never);

    expect(lastReply(event, 'check-stem-tools-update')!.args[0]).toMatchObject({
      available: true,
      updateAvailable: false,
    });
  });

  it('reports unavailable when the manifest fetch fails', async () => {
    installBundle(userData, '1.0.0', 'demucs-split');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );

    const event = makeEvent();

    await checkStemToolsUpdate(event as never);

    expect(lastReply(event, 'check-stem-tools-update')!.args[0]).toEqual({
      available: false,
      updateAvailable: false,
    });
  });

  it('reports unavailable on an unsupported platform', async () => {
    setPlatform('linux', 'x64');

    const event = makeEvent();

    await checkStemToolsUpdate(event as never);

    expect(lastReply(event, 'check-stem-tools-update')!.args[0]).toEqual({
      available: false,
      updateAvailable: false,
    });
  });
});
