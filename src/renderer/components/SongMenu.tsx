import { useRef, useState, type CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEllipsisVertical,
  faFolder,
  faHandScissors,
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '../cn';
import { usePopoverOutsideClick } from '../hooks/usePopoverOutsideClick';
import { StemToolsStatus } from '../../types';

interface Props {
  id: string;
  dir: string;
  stemToolsStatus: StemToolsStatus;
  canSplit: boolean;
  splitting: boolean;
  onSplit: () => void;
}

export function SongMenu({
  id,
  dir,
  stemToolsStatus,
  canSplit,
  splitting,
  onSplit,
}: Props) {
  const anchorName = `--song-menu-${id}` as string;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  usePopoverOutsideClick(isOpen, popoverRef, triggerRef, () => {
    popoverRef.current?.hidePopover();
    setIsOpen(false);
  });

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const el = popoverRef.current;

    if (!el) {
      return;
    }

    if (el.matches(':popover-open')) {
      el.hidePopover();
      setIsOpen(false);
    } else {
      el.showPopover();
      setIsOpen(true);
    }
  };
  const close = () => {
    popoverRef.current?.hidePopover();
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        data-testid="song-menu-trigger"
        className={cn(
          'bg-transparent p-0 border-0 cursor-pointer hover:text-text-faint mt-auto text-text-dim w-7',
        )}
        style={{ anchorName } as CSSProperties}
        onClick={toggle}
      >
        <FontAwesomeIcon size="xl" icon={faEllipsisVertical} />
      </button>

      <div
        ref={popoverRef}
        popover="manual"
        className={cn(
          'border border-border rounded-xl shadow-panel font-ui fixed inset-[unset] m-[unset]',
          { 'flex flex-col': isOpen },
        )}
        style={
          {
            background: 'var(--gradient-header)',
            positionAnchor: anchorName,
            top: 'calc(anchor(bottom) + 4px)',
            right: 'anchor(right)',
          } as CSSProperties
        }
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="flex items-center gap-3 px-4 py-2.5 text-text-muted hover:text-text cursor-pointer bg-transparent border-0 whitespace-nowrap w-full text-left"
          onClick={(e) => {
            e.stopPropagation();
            window.electron.ipcRenderer.sendMessage('open-song-directory', dir);
            close();
          }}
        >
          <FontAwesomeIcon icon={faFolder} className="w-4" />
          Open song directory
        </button>

        {stemToolsStatus === 'ready' && canSplit && (
          <button
            className="flex items-center gap-3 px-4 py-2.5 text-text-muted hover:text-text cursor-pointer bg-transparent border-0 whitespace-nowrap w-full text-left disabled:opacity-40 disabled:cursor-default"
            disabled={splitting}
            onClick={(e) => {
              e.stopPropagation();
              onSplit();
              close();
            }}
          >
            <FontAwesomeIcon icon={faHandScissors} className="w-4" />
            {splitting ? 'Splitting…' : 'Split stems'}
          </button>
        )}
      </div>
    </>
  );
}
