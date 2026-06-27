import type { Meta, StoryObj } from '@storybook/react';
import { Stars } from './Stars';

const meta: Meta<typeof Stars> = {
  title: 'Primitives/Stars',
  component: Stars,
  args: {
    rating: 3,
    perfect: false,
    glow: false,
    size: '2x',
    count: 5,
    className: 'gap-2',
  },
  argTypes: {
    rating: { control: { type: 'range', min: 0, max: 5, step: 1 } },
    perfect: { control: 'boolean' },
    glow: { control: 'boolean' },
    size: {
      control: 'radio',
      options: ['xs', 'sm', 'lg', '2x', '3x'],
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-bg p-8 inline-flex">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Stars>;

export const ThreeOfFive: Story = {};

export const Empty: Story = { args: { rating: 0 } };

export const Full: Story = { args: { rating: 5 } };

export const Glowing: Story = { args: { rating: 4, glow: true } };

export const Perfect: Story = {
  args: { rating: 5, perfect: true, glow: true },
};

export const Small: Story = { args: { size: 'xs', className: 'gap-1' } };
