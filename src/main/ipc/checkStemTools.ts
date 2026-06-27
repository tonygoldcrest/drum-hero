import {
  IpcCheckStemToolsResponse,
  IpcStemToolsRemoteResponse,
  StemToolsManifest,
} from '../../types';
import {
  getManifestName,
  getPlatformSlug,
  isInstalled,
  isSupported,
  normalizeVersion,
  readInstalledManifest,
  releaseAssetUrl,
} from '../stemTools';

export function checkStemTools(event: Electron.IpcMainEvent) {
  if (!isSupported()) {
    event.reply('check-stem-tools', {
      status: 'unsupported',
    } satisfies IpcCheckStemToolsResponse);

    return;
  }

  if (!isInstalled()) {
    event.reply('check-stem-tools', {
      status: 'download',
    } satisfies IpcCheckStemToolsResponse);

    return;
  }

  event.reply('check-stem-tools', {
    status: 'ready',
    installedVersion: readInstalledManifest()!.version,
  } satisfies IpcCheckStemToolsResponse);
}

export async function checkStemToolsUpdate(event: Electron.IpcMainEvent) {
  const slug = getPlatformSlug();

  if (!slug) {
    event.reply('check-stem-tools-update', {
      available: false,
      updateAvailable: false,
    } satisfies IpcStemToolsRemoteResponse);

    return;
  }

  const installed = readInstalledManifest();

  try {
    const response = await fetch(releaseAssetUrl(getManifestName(slug)));

    if (!response.ok) {
      throw new Error(`Manifest fetch returned ${response.status}`);
    }

    const remote = (await response.json()) as StemToolsManifest;
    const latestVersion = normalizeVersion(remote.version);

    event.reply('check-stem-tools-update', {
      available: true,
      latestVersion,
      downloadSize: remote.downloadSize,
      uncompressedSize: remote.uncompressedSize,
      updateAvailable:
        installed !== undefined &&
        normalizeVersion(installed.version) !== latestVersion,
    } satisfies IpcStemToolsRemoteResponse);
  } catch {
    event.reply('check-stem-tools-update', {
      available: false,
      updateAvailable: false,
    } satisfies IpcStemToolsRemoteResponse);
  }
}
