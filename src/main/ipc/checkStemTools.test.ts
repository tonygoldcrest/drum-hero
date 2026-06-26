import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lastReply, makeEvent } from './test-support';

const userDataHolder = vi.hoisted(() => ({ current: '' }));

vi.mock('electron', () => ({
  app: { getPath: () => userDataHolder.current },
}));

const { checkStemTools } = await import('./checkStemTools');

function setPlatform(platform: NodeJS.Platform, arch = process.arch) {
  Object.defineProperty(process, 'platform', { value: platform });
  Object.defineProperty(process, 'arch', { value: arch });
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
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('reports unsupported on platforms without a stem binary', () => {
    setPlatform('linux', 'x64');

    const event = makeEvent();

    checkStemTools(event as never);

    expect(lastReply(event, 'check-stem-tools')!.args[0]).toBe('unsupported');
  });

  it('reports download when supported but the binary is missing', () => {
    setPlatform('darwin', 'arm64');

    const event = makeEvent();

    checkStemTools(event as never);

    expect(lastReply(event, 'check-stem-tools')!.args[0]).toBe('download');
  });

  it('reports ready when the macOS binary is present', () => {
    setPlatform('darwin', 'arm64');

    const binaryDir = path.join(userData, 'stem-tools', 'demucs-split');

    fs.mkdirSync(binaryDir, { recursive: true });
    fs.writeFileSync(path.join(binaryDir, 'demucs-split'), '');

    const event = makeEvent();

    checkStemTools(event as never);

    expect(lastReply(event, 'check-stem-tools')!.args[0]).toBe('ready');
  });

  it('looks for the .exe binary on Windows', () => {
    setPlatform('win32', 'x64');

    const binaryDir = path.join(userData, 'stem-tools', 'demucs-split');

    fs.mkdirSync(binaryDir, { recursive: true });
    fs.writeFileSync(path.join(binaryDir, 'demucs-split.exe'), '');

    const event = makeEvent();

    checkStemTools(event as never);

    expect(lastReply(event, 'check-stem-tools')!.args[0]).toBe('ready');
  });
});
