import type { Meta, StoryObj } from '@storybook/react';
import { Reference } from './Reference';

const meta: Meta<typeof Reference> = {
  title: 'Song View/Reference',
  component: Reference,
  decorators: [
    (Story) => (
      <div className="p-10 bg-paper flex justify-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Reference>;

export const Default: Story = {};
