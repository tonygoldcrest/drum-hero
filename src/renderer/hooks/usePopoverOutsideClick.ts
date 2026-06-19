import { useEffect, type RefObject } from 'react';

export function usePopoverOutsideClick(
  isOpen: boolean,
  popoverRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        !popoverRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);

    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, popoverRef, triggerRef, onClose]);
}
