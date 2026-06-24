import { useRef, useEffect, type CSSProperties, type RefObject } from 'react';
import { Button } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowDown,
  faArrowUp,
  faHeart,
  faSort,
} from '@fortawesome/free-solid-svg-icons';
import { useLocation } from 'react-router-dom';
import { cn } from '../cn';
import { usePopoverOutsideClick } from '../hooks/usePopoverOutsideClick';

export type SortKey = 'name' | 'favorite' | 'lastAdded' | 'difficulty';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: SortKey | null;
  direction: SortDirection;
}

interface Props {
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  focusedIndex?: number;
}

export const DIRECTIONAL_KEYS: SortKey[] = ['name', 'lastAdded', 'difficulty'];

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'favorite', label: 'Favorite' },
  { key: 'lastAdded', label: 'Last added' },
  { key: 'difficulty', label: 'Difficulty' },
];

export function SortButton({
  sort,
  onSortChange,
  isOpen,
  onOpenChange,
  focusedIndex,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const el = popoverRef.current;

    if (!el) {
      return;
    }

    if (isOpen) {
      if (!el.matches(':popover-open')) {
        el.showPopover();
      }
    } else if (el.matches(':popover-open')) {
      el.hidePopover();
    }
  }, [isOpen]);

  useEffect(() => {
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  usePopoverOutsideClick(isOpen, popoverRef, triggerRef, () => {
    onOpenChange(false);
  });

  const handleClick = (key: SortKey) => {
    if (key === 'favorite') {
      onSortChange({
        key: sort.key === 'favorite' ? null : 'favorite',
        direction: 'asc',
      });

      return;
    }

    if (sort.key === key) {
      onSortChange({
        key,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onSortChange({ key, direction: 'asc' });
    }
  };
  const dirIcon = (key: SortKey) => {
    if (!DIRECTIONAL_KEYS.includes(key)) {
      return null;
    }

    if (sort.key === key) {
      return sort.direction === 'asc' ? faArrowUp : faArrowDown;
    }

    return faArrowUp;
  };

  return (
    <>
      <Button
        ref={triggerRef as RefObject<HTMLButtonElement>}
        icon={<FontAwesomeIcon icon={faSort} />}
        onClick={() => onOpenChange(!isOpen)}
        size="large"
        style={{ anchorName: '--sort-trigger' } as CSSProperties}
      />
      <div
        ref={popoverRef}
        popover="manual"
        className={cn(
          'border border-border p-3 rounded-xl shadow-panel font-ui fixed min-w-44 inset-[unset] m-[unset] gap-2',
          { 'flex flex-col': isOpen },
        )}
        style={
          {
            background: 'var(--gradient-header)',
            positionAnchor: '--sort-trigger',
            top: 'calc(anchor(bottom) + 8px)',
            right: 'anchor(right)',
          } as CSSProperties
        }
      >
        {SORT_OPTIONS.map(({ key, label }, index) => {
          const icon = key === 'favorite' ? faHeart : dirIcon(key)!;

          return (
            <Button
              key={key}
              type={sort.key === key ? 'primary' : 'default'}
              onClick={() => handleClick(key)}
              className={cn('justify-start', {
                'outline outline-2 outline-accent': index === focusedIndex,
              })}
            >
              <div className="flex justify-between w-full items-center">
                <div>{label}</div>
                <div>
                  <FontAwesomeIcon icon={icon} />
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </>
  );
}
