import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Popover } from './Popover';

function Harness() {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      anchorName="--test-anchor"
      open={open}
      onOpenChange={setOpen}
      renderTrigger={({ ref, toggle, anchorStyle }) => (
        <button ref={ref} style={anchorStyle} onClick={toggle}>
          trigger
        </button>
      )}
    >
      <div>content</div>
    </Popover>
  );
}

function renderPopover() {
  return render(
    <MemoryRouter>
      <Harness />
    </MemoryRouter>,
  );
}

describe('Popover', () => {
  it('toggles open and closed from the trigger', () => {
    renderPopover();

    const popover = document.querySelector('[popover]')!;

    expect(popover.matches(':popover-open')).toBe(false);

    fireEvent.click(screen.getByText('trigger'));

    expect(popover.matches(':popover-open')).toBe(true);

    fireEvent.click(screen.getByText('trigger'));

    expect(popover.matches(':popover-open')).toBe(false);
  });

  it('renders the content', () => {
    renderPopover();

    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('applies the anchor name to the trigger', () => {
    renderPopover();

    expect(screen.getByText('trigger').style.anchorName).toBe('--test-anchor');
  });

  it('closes on an outside click', () => {
    renderPopover();

    fireEvent.click(screen.getByText('trigger'));

    const popover = document.querySelector('[popover]')!;

    expect(popover.matches(':popover-open')).toBe(true);

    fireEvent.mouseDown(document.body);

    expect(popover.matches(':popover-open')).toBe(false);
  });
});
