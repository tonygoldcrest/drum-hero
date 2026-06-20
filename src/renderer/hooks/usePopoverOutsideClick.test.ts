import { createRef } from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePopoverOutsideClick } from './usePopoverOutsideClick';

function mountElement(): HTMLElement {
  const el = document.createElement('div');

  document.body.appendChild(el);

  return el;
}

describe('usePopoverOutsideClick', () => {
  let popover: HTMLElement;
  let trigger: HTMLElement;
  let outside: HTMLElement;

  beforeEach(() => {
    popover = mountElement();
    trigger = mountElement();
    outside = mountElement();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function refTo(el: HTMLElement | null) {
    const ref = createRef<HTMLElement | null>();

    (ref as { current: HTMLElement | null }).current = el;

    return ref;
  }

  function dispatch(target: HTMLElement) {
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  }

  it('does not attach a listener when closed', () => {
    const onClose = vi.fn();

    renderHook(() =>
      usePopoverOutsideClick(false, refTo(popover), refTo(trigger), onClose),
    );

    dispatch(outside);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking outside both refs', () => {
    const onClose = vi.fn();

    renderHook(() =>
      usePopoverOutsideClick(true, refTo(popover), refTo(trigger), onClose),
    );

    dispatch(outside);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
  });

  it('does not close when clicking inside the popover', () => {
    const onClose = vi.fn();
    const child = document.createElement('span');

    popover.appendChild(child);

    renderHook(() =>
      usePopoverOutsideClick(true, refTo(popover), refTo(trigger), onClose),
    );

    dispatch(child);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close when clicking inside the trigger', () => {
    const onClose = vi.fn();

    renderHook(() =>
      usePopoverOutsideClick(true, refTo(popover), refTo(trigger), onClose),
    );

    dispatch(trigger);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('removes the listener when it closes', () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }) =>
        usePopoverOutsideClick(open, refTo(popover), refTo(trigger), onClose),
      { initialProps: { open: true } },
    );

    rerender({ open: false });
    dispatch(outside);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('removes the listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() =>
      usePopoverOutsideClick(true, refTo(popover), refTo(trigger), onClose),
    );

    unmount();
    dispatch(outside);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses the latest onClose after it changes', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ cb }) =>
        usePopoverOutsideClick(true, refTo(popover), refTo(trigger), cb),
      { initialProps: { cb: first } },
    );

    rerender({ cb: second });
    dispatch(outside);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('closes when both refs are null', () => {
    const onClose = vi.fn();

    renderHook(() =>
      usePopoverOutsideClick(true, refTo(null), refTo(null), onClose),
    );

    dispatch(outside);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('attaches the listener when it opens after being closed', () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }) =>
        usePopoverOutsideClick(open, refTo(popover), refTo(trigger), onClose),
      { initialProps: { open: false } },
    );

    dispatch(outside);
    expect(onClose).not.toHaveBeenCalled();

    rerender({ open: true });
    dispatch(outside);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
