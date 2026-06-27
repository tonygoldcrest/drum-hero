import type { Meta, StoryObj } from '@storybook/react';
import { SortMenu } from './SortMenu';

const meta: Meta<typeof SortMenu> = {
  title: 'Song List/Sort Menu',
  component: SortMenu,
  args: {
    sort: { key: null, direction: 'asc' },
    onSortChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="p-6">
        <div className="border border-border rounded-xl shadow-panel flex flex-col p-3 gap-2 min-w-44 bg-bg">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SortMenu>;

export const Unsorted: Story = {};

export const NameAscending: Story = {
  args: { sort: { key: 'name', direction: 'asc' } },
};

export const NameDescending: Story = {
  args: { sort: { key: 'name', direction: 'desc' } },
};

export const FavoriteActive: Story = {
  args: { sort: { key: 'favorite', direction: 'asc' } },
};

export const FocusedDifficulty: Story = {
  args: { sort: { key: 'difficulty', direction: 'asc' }, focusedIndex: 3 },
};
