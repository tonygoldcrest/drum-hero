import { ReactNode, useEffect, useRef } from 'react';
import { Divider } from 'antd';
import { cn } from '../../cn';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  testId?: string;
  panelClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  header,
  footer,
  children,
  testId,
  panelClassName,
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      backdropRef.current?.showPopover();
    } else {
      backdropRef.current?.hidePopover();
    }
  }, [isOpen]);

  return (
    <div
      ref={backdropRef}
      data-testid={testId}
      className={cn(
        'fixed w-full h-full backdrop-blur-xs bg-transparent z-10',
        {
          flex: isOpen,
        },
      )}
      popover="manual"
      onMouseDown={(event) => {
        event.stopPropagation();

        const target = event.target as Node;

        if (!panelRef.current?.contains(target)) {
          event.preventDefault();
        }
      }}
      onClick={(event) => {
        event.stopPropagation();

        const target = event.target as Node;

        if (panelRef.current?.contains(target)) {
          return;
        }

        event.preventDefault();
        onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={cn(
          'border border-border rounded-xl shadow-panel font-ui w-140 m-auto flex flex-col bg-bg',
          panelClassName,
        )}
      >
        {header !== undefined && (
          <>
            <div
              className="text-text-body p-4 rounded-t-xl"
              style={{ background: 'var(--gradient-header)' }}
            >
              {header}
            </div>
            <Divider />
          </>
        )}

        {children}

        {footer !== undefined && (
          <>
            <Divider />
            <div
              className="p-4 rounded-b-xl flex gap-3"
              style={{ background: 'var(--gradient-header-reverse)' }}
            >
              {footer}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
