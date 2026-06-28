import type { CSSProperties } from 'react';
import type { ModalProps, PopoverProps } from 'antd';

const border = '1px solid var(--color-border)';
const panelShadow = 'var(--shadow-panel)';
const sectionPadding: CSSProperties = { margin: 0, padding: '16px 24px' };

export const modalStyles: ModalProps['styles'] = {
  container: { padding: 0, overflow: 'hidden', border, boxShadow: panelShadow },
  header: {
    ...sectionPadding,
    background: 'var(--gradient-header)',
    borderBottom: border,
  },
  body: { padding: '16px 24px' },
  footer: {
    ...sectionPadding,
    background: 'var(--gradient-header-reverse)',
    borderTop: border,
  },
  mask: { background: 'rgba(10, 10, 12, 0.4)', backdropFilter: 'blur(2px)' },
};

export const popoverStyles: PopoverProps['styles'] = {
  container: { border, boxShadow: panelShadow },
};

export const MODAL_ABOVE_POPOVER_Z_INDEX = 1050;

export function isAnyModalOpen(): boolean {
  return Array.from(document.querySelectorAll('.ant-modal-wrap')).some(
    (element) => (element as HTMLElement).style.display !== 'none',
  );
}

export function popoverOpenChange(
  setOpen: (open: boolean) => void,
): (open: boolean) => void {
  return (open) => {
    if (open || !isAnyModalOpen()) {
      setOpen(open);
    }
  };
}
