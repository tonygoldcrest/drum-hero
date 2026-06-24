import {
  useRef,
  useState,
  useEffect,
  type CSSProperties,
  type RefObject,
} from 'react';
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
}

const DIRECTIONAL_KEYS: SortKey[] = ['name', 'lastAdded', 'difficulty'];

export function SortButton({ sort, onSortChange }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { pathname } = useLocation();
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsPopoverOpen(false);
  }

  useEffect(() => {
    popoverRef.current?.hidePopover();
  }, [pathname]);
  usePopoverOutsideClick(isPopoverOpen, popoverRef, triggerRef, () => {
    popoverRef.current?.hidePopover();
    setIsPopoverOpen(false);
  });

  const toggle = () => {
    const el = popoverRef.current;

    if (!el) {
      return;
    }

    if (el.matches(':popover-open')) {
      el.hidePopover();
      setIsPopoverOpen(false);
    } else {
      el.showPopover();
      setIsPopoverOpen(true);
    }
  };
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
  const options: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'favorite', label: 'Favorite' },
    { key: 'lastAdded', label: 'Last added' },
    { key: 'difficulty', label: 'Difficulty' },
  ];

  return (
    <>
      <Button
        ref={triggerRef as RefObject<HTMLButtonElement>}
        icon={<FontAwesomeIcon icon={faSort} />}
        onClick={toggle}
        size="large"
        style={{ anchorName: '--sort-trigger' } as CSSProperties}
      />
      <div
        ref={popoverRef}
        popover="manual"
        className={cn(
          'border border-border p-3 rounded-xl shadow-panel font-ui fixed min-w-44 inset-[unset] m-[unset] gap-2',
          { 'flex flex-col': isPopoverOpen },
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
        {options.map(({ key, label }) => {
          const icon = key === 'favorite' ? faHeart : dirIcon(key)!;

          return (
            <Button
              key={key}
              type={sort.key === key ? 'primary' : 'default'}
              onClick={() => handleClick(key)}
              className="justify-start"
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
