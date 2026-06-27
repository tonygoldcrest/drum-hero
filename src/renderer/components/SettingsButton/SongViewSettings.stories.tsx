import type { Meta, StoryObj } from '@storybook/react';
import { AudioVolume } from '../AudioVolume';
import { SongViewSettings } from './SongViewSettings';

const noop = () => {};
const volumeSliders = [
  <AudioVolume
    key="drums"
    name="drums"
    volume={80}
    isMuted={false}
    isSoloed={false}
    onChange={noop}
    onMuteClick={noop}
    onSoloClick={noop}
  />,
  <AudioVolume
    key="song"
    name="song"
    volume={55}
    isMuted={false}
    isSoloed={false}
    onChange={noop}
    onMuteClick={noop}
    onSoloClick={noop}
  />,
];
const meta: Meta<typeof SongViewSettings> = {
  title: 'Settings/Song View Settings',
  component: SongViewSettings,
  args: {
    playheadStyle: 'Cursor',
    enableColors: true,
    showBarNumbers: false,
    showTempo: true,
    countIn: true,
    isDev: false,
    onPlayheadStyleChange: noop,
    onEnableColorsChange: noop,
    onShowBarNumbersChange: noop,
    onShowTempoChange: noop,
    onCountInChange: noop,
    onSetupInput: noop,
  },
  decorators: [
    (Story) => (
      <div className="p-6">
        <div className="border border-border rounded-xl shadow-panel bg-bg p-3 flex flex-col gap-3 min-w-90 w-max">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SongViewSettings>;

export const Default: Story = {};

export const DevMode: Story = { args: { isDev: true } };

export const WithMixer: Story = { args: { volumeSliders } };
