import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('reveals the panel only when open', () => {
    const { rerender } = render(
      <Modal isOpen={false} testId="modal">
        <div>body</div>
      </Modal>,
    );

    expect(screen.getByTestId('modal')).not.toHaveClass('flex');

    rerender(
      <Modal isOpen testId="modal">
        <div>body</div>
      </Modal>,
    );

    expect(screen.getByTestId('modal')).toHaveClass('flex');
  });

  it('renders its children', () => {
    render(
      <Modal isOpen>
        <div>hello</div>
      </Modal>,
    );

    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('closes when the backdrop is clicked and onClose is provided', () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen onClose={onClose} testId="modal">
        <div>body</div>
      </Modal>,
    );

    fireEvent.click(screen.getByTestId('modal'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the panel itself is clicked', () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen onClose={onClose}>
        <div>body</div>
      </Modal>,
    );

    fireEvent.click(screen.getByText('body'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores backdrop clicks when no onClose is provided', () => {
    render(
      <Modal isOpen testId="modal">
        <div>body</div>
      </Modal>,
    );

    expect(() => fireEvent.click(screen.getByTestId('modal'))).not.toThrow();
  });

  it('keeps native inputs inside the panel usable (does not prevent their mousedown)', () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        <select data-testid="select">
          <option>a</option>
        </select>
      </Modal>,
    );

    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });

    screen.getByTestId('select').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});
