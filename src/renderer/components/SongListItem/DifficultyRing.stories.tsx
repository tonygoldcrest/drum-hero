import type { Meta, StoryObj } from '@storybook/react';
import { DifficultyRing } from './DifficultyRing';

const meta: Meta<typeof DifficultyRing> = {
  title: 'Primitives/Difficulty Ring',
  component: DifficultyRing,
  args: { value: 3 },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 5, step: 1 } },
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

type Story = StoryObj<typeof DifficultyRing>;

export const Zero: Story = { args: { value: 0 } };

export const Three: Story = { args: { value: 3 } };

export const Five: Story = { args: { value: 5 } };
