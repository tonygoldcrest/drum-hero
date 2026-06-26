import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SortButton, SortState } from './SortButton';

function renderButton(sort: SortState, isOpen = true) {
  const onSortChange = vi.fn();
  const onOpenChange = vi.fn();
  const utils = render(
    <MemoryRouter>
      <SortButton
        sort={sort}
        onSortChange={onSortChange}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      />
    </MemoryRouter>,
  );

  return { onSortChange, onOpenChange, ...utils };
}

function optionButton(label: string) {
  return screen.getByText(label).closest('button')!;
}

describe('SortButton', () => {
  it('opens the menu from the trigger', () => {
    const { onOpenChange } = renderButton(
      { key: null, direction: 'asc' },
      false,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('selects an unsorted directional key ascending', () => {
    const { onSortChange } = renderButton({ key: null, direction: 'asc' });

    fireEvent.click(optionButton('Name'));

    expect(onSortChange).toHaveBeenCalledWith({
      key: 'name',
      direction: 'asc',
    });
  });

  it('flips direction when the active directional key is clicked again', () => {
    const { onSortChange } = renderButton({ key: 'name', direction: 'asc' });

    fireEvent.click(optionButton('Name'));

    expect(onSortChange).toHaveBeenCalledWith({
      key: 'name',
      direction: 'desc',
    });
  });

  it('switches to a different directional key ascending', () => {
    const { onSortChange } = renderButton({ key: 'name', direction: 'desc' });

    fireEvent.click(optionButton('Difficulty'));

    expect(onSortChange).toHaveBeenCalledWith({
      key: 'difficulty',
      direction: 'asc',
    });
  });

  it('toggles the favorite filter on and off without a direction change', () => {
    const off = renderButton({ key: null, direction: 'asc' });

    fireEvent.click(optionButton('Favorite'));

    expect(off.onSortChange).toHaveBeenCalledWith({
      key: 'favorite',
      direction: 'asc',
    });

    off.unmount();

    const on = renderButton({ key: 'favorite', direction: 'asc' });

    fireEvent.click(optionButton('Favorite'));

    expect(on.onSortChange).toHaveBeenCalledWith({
      key: null,
      direction: 'asc',
    });
  });

  it('shows a descending arrow on the active key when sorted descending', () => {
    renderButton({ key: 'lastAdded', direction: 'desc' });

    const button = optionButton('Last added');

    expect(button.querySelector('[data-icon="arrow-down"]')).not.toBeNull();
  });
});
