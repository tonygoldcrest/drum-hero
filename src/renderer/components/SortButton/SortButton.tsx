import { type CSSProperties, type RefObject } from 'react';
import { Button } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort } from '@fortawesome/free-solid-svg-icons';
import { Popover } from '../Popover';
import { SortMenu } from './SortMenu';
import { SortState } from './sort';

export * from './sort';

interface Props {
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  focusedIndex?: number;
}

export function SortButton({
  sort,
  onSortChange,
  isOpen,
  onOpenChange,
  focusedIndex,
}: Props) {
  return (
    <Popover
      anchorName="--sort-trigger"
      open={isOpen}
      onOpenChange={onOpenChange}
      contentClassName="min-w-60 p-3 gap-2"
      renderTrigger={({ ref, toggle, anchorStyle }) => (
        <Button
          ref={ref as RefObject<HTMLButtonElement>}
          icon={<FontAwesomeIcon icon={faSort} />}
          onClick={toggle}
          size="large"
          style={anchorStyle as CSSProperties}
        />
      )}
    >
      <SortMenu
        sort={sort}
        onSortChange={onSortChange}
        focusedIndex={focusedIndex}
      />
    </Popover>
  );
}
