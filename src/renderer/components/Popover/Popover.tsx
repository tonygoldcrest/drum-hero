import {
  ReactNode,
  useEffect,
  useRef,
  type CSSProperties,
  type RefObject,
} from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../cn';
import { usePopoverOutsideClick } from '../../hooks/usePopoverOutsideClick';

interface TriggerArgs {
  ref: RefObject<HTMLButtonElement | null>;
  toggle: () => void;
  isOpen: boolean;
  anchorStyle: CSSProperties;
}

interface Props {
  anchorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renderTrigger: (args: TriggerArgs) => ReactNode;
  children: ReactNode;
  offset?: number;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  closeOnRouteChange?: boolean;
}

export function Popover({
  anchorName,
  open,
  onOpenChange,
  renderTrigger,
  children,
  offset = 8,
  contentClassName,
  contentStyle,
  closeOnRouteChange = true,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const el = popoverRef.current;

    if (!el) {
      return;
    }

    if (open) {
      if (!el.matches(':popover-open')) {
        el.showPopover();
      }
    } else if (el.matches(':popover-open')) {
      el.hidePopover();
    }
  }, [open]);

  useEffect(() => {
    if (closeOnRouteChange) {
      onOpenChange(false);
    }
  }, [pathname, closeOnRouteChange, onOpenChange]);

  usePopoverOutsideClick(open, popoverRef, triggerRef, () => {
    onOpenChange(false);
  });

  const toggle = () => {
    onOpenChange(!open);
  };

  return (
    <>
      {renderTrigger({
        ref: triggerRef,
        toggle,
        isOpen: open,
        anchorStyle: { anchorName } as CSSProperties,
      })}

      <div
        ref={popoverRef}
        popover="manual"
        className={cn(
          'border border-border rounded-xl shadow-panel font-ui fixed inset-[unset] m-[unset] bg-bg',
          { 'flex flex-col': open },
          contentClassName,
        )}
        style={
          {
            positionAnchor: anchorName,
            top: `calc(anchor(bottom) + ${offset}px)`,
            right: 'anchor(right)',
            ...contentStyle,
          } as CSSProperties
        }
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}
