import type { Meta, StoryObj } from '@storybook/react';
import { CountIn } from './CountIn';

const meta: Meta<typeof CountIn> = {
  title: 'Song View/Count In',
  component: CountIn,
  args: { count: 3, beatMs: 800, animated: false },
  argTypes: {
    count: { control: { type: 'number' } },
    beatMs: { control: { type: 'number' } },
    animated: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: 480, background: '#0d0d0f' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof CountIn>;

export const Three: Story = { args: { count: 3 } };

export const Animated: Story = { args: { count: 3, animated: true } };
