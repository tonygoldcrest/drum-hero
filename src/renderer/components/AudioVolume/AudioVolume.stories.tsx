import type { Meta, StoryObj } from '@storybook/react';
import { AudioVolume } from './AudioVolume';

const meta: Meta<typeof AudioVolume> = {
  title: 'Song View/Audio Volume',
  component: AudioVolume,
  args: {
    name: 'drums',
    volume: 80,
    isMuted: false,
    isSoloed: false,
    onChange: () => {},
    onMuteClick: () => {},
    onSoloClick: () => {},
  },
  argTypes: {
    volume: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    isMuted: { control: 'boolean' },
    isSoloed: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div
        className="grid grid-cols-[max-content_1fr_max-content_max-content] items-center gap-x-2 gap-y-1 bg-bg p-4 rounded-xl"
        style={{ width: 360 }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof AudioVolume>;

export const Default: Story = {};

export const Muted: Story = { args: { volume: 0, isMuted: true } };

export const Soloed: Story = { args: { isSoloed: true } };
