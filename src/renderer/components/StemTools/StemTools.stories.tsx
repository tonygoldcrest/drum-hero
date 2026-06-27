import type { Meta, StoryObj } from '@storybook/react';
import { StemTools } from './StemTools';

const DOWNLOAD_SIZE = 280_000_000;
const UNCOMPRESSED_SIZE = 700_000_000;
const meta: Meta<typeof StemTools> = {
  title: 'Settings/Stem Tools',
  component: StemTools,
  args: {
    onDownloadStemTools: () => {},
    onCancelStemTools: () => {},
    onDeleteStemTools: () => {},
  },
  argTypes: {
    stemToolsStatus: { control: 'radio', options: ['download', 'ready'] },
    available: { control: 'boolean' },
    stemToolsLoading: { control: 'boolean' },
    downloadPercent: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    phase: { control: 'radio', options: ['downloading', 'extracting'] },
    installedVersion: { control: 'text' },
    latestVersion: { control: 'text' },
    updateAvailable: { control: 'boolean' },
    downloadSize: { control: 'number' },
    uncompressedSize: { control: 'number' },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 24 }}>
        <div
          className="border border-border p-3 rounded-xl shadow-panel bg-bg flex flex-col gap-3"
          style={{ width: 360 }}
        >
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof StemTools>;

export const AvailableToDownload: Story = {
  args: {
    stemToolsStatus: 'download',
    available: true,
    downloadSize: DOWNLOAD_SIZE,
    uncompressedSize: UNCOMPRESSED_SIZE,
  },
};

export const Unavailable: Story = {
  args: {
    stemToolsStatus: 'download',
    available: false,
  },
};

export const Pending: Story = {
  args: {
    stemToolsStatus: 'download',
    available: undefined,
  },
};

export const Downloading: Story = {
  args: {
    stemToolsStatus: 'download',
    stemToolsLoading: true,
    phase: 'downloading',
    downloadPercent: 35,
  },
};

export const Extracting: Story = {
  args: {
    stemToolsStatus: 'download',
    stemToolsLoading: true,
    phase: 'extracting',
    downloadPercent: 72,
  },
};

export const Starting: Story = {
  args: {
    stemToolsStatus: 'download',
    stemToolsLoading: true,
  },
};

export const Installed: Story = {
  args: {
    stemToolsStatus: 'ready',
    installedVersion: '1.2.0',
  },
};

export const UpdateAvailable: Story = {
  args: {
    stemToolsStatus: 'ready',
    installedVersion: '1.0.0',
    latestVersion: '1.2.0',
    updateAvailable: true,
    downloadSize: DOWNLOAD_SIZE,
    uncompressedSize: UNCOMPRESSED_SIZE,
  },
};

export const Playground: Story = {
  args: {
    stemToolsStatus: 'download',
    available: true,
    downloadSize: DOWNLOAD_SIZE,
    uncompressedSize: UNCOMPRESSED_SIZE,
  },
};
