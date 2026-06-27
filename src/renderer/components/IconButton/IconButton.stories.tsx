import type { Meta, StoryObj } from '@storybook/react';
import {
  faHeart,
  faXmark,
  faTrash,
  faEllipsisVertical,
} from '@fortawesome/free-solid-svg-icons';
import { IconButton } from './IconButton';

const meta: Meta<typeof IconButton> = {
  title: 'Primitives/Icon Button',
  component: IconButton,
  args: {
    icon: faHeart,
    type: 'default',
    size: 'md',
  },
  argTypes: {
    type: { control: 'radio', options: ['default', 'primary', 'danger'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    icon: { table: { disable: true } },
  },
  decorators: [
    (Story) => (
      <div className="bg-bg p-8 inline-flex gap-4 items-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof IconButton>;

export const Default: Story = {};

export const Primary: Story = { args: { type: 'primary' } };

export const Danger: Story = { args: { type: 'danger', icon: faTrash } };

export const Small: Story = { args: { size: 'sm', icon: faXmark } };

export const Large: Story = { args: { size: 'lg', icon: faEllipsisVertical } };
