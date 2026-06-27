import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lastReply, makeEvent } from './test-support';

const userDataHolder = vi.hoisted(() => ({ current: '' }));

vi.mock('electron', () => ({
  app: { getPath: () => userDataHolder.current },
}));

const { deleteStemTools } = await import('./deleteStemTools');

describe('deleteStemTools', () => {
  let userData: string;

  beforeEach(() => {
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'userdata-'));
    userDataHolder.current = userData;
  });

  afterEach(() => {
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('removes the installed bundle and reports success', () => {
    const bundleDir = path.join(userData, 'stem-tools', 'demucs-split');

    fs.mkdirSync(path.join(bundleDir, '_internal'), { recursive: true });
    fs.writeFileSync(path.join(bundleDir, 'demucs-split'), '');
    fs.writeFileSync(path.join(bundleDir, '_internal', 'lib'), '');

    const event = makeEvent();

    deleteStemTools(event as never);

    expect(fs.existsSync(bundleDir)).toBe(false);
    expect(lastReply(event, 'delete-stem-tools')!.args[0]).toEqual({
      success: true,
    });
  });

  it('succeeds even when nothing is installed', () => {
    const event = makeEvent();

    deleteStemTools(event as never);

    expect(lastReply(event, 'delete-stem-tools')!.args[0]).toEqual({
      success: true,
    });
  });
});
