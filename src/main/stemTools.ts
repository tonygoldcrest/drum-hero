import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { StemToolsManifest } from '../types';

export const STEM_TOOLS_REPO = 'tonygoldcrest/sightkick-tools';

export function getPlatformSlug(): string | undefined {
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    return 'mac-arm64';
  }

  if (process.platform === 'win32') {
    return 'win-x64';
  }

  return undefined;
}

export function isSupported(): boolean {
  return getPlatformSlug() !== undefined;
}

export function getArchiveName(slug: string): string {
  return `demucs-split-${slug}.tar.gz`;
}

export function getManifestName(slug: string): string {
  return `manifest-${slug}.json`;
}

export function releaseAssetUrl(asset: string): string {
  return `https://github.com/${STEM_TOOLS_REPO}/releases/latest/download/${asset}`;
}

export function getStemToolsDir(): string {
  return path.join(app.getPath('userData'), 'stem-tools');
}

export function getBundleDir(): string {
  return path.join(getStemToolsDir(), 'demucs-split');
}

export function getBinaryPath(): string {
  const binaryName =
    process.platform === 'win32' ? 'demucs-split.exe' : 'demucs-split';

  return path.join(getBundleDir(), binaryName);
}

export function getInstalledManifestPath(): string {
  return path.join(getBundleDir(), 'manifest.json');
}

export function readInstalledManifest(): StemToolsManifest | undefined {
  try {
    const raw = fs.readFileSync(getInstalledManifestPath(), 'utf-8');

    return JSON.parse(raw) as StemToolsManifest;
  } catch {
    return undefined;
  }
}

export function isInstalled(): boolean {
  return (
    readInstalledManifest() !== undefined && fs.existsSync(getBinaryPath())
  );
}

export function normalizeVersion(version: string): string {
  return version.replace(/^v/, '');
}
