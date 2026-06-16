import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import { SongData } from '../../types';
import { cn } from '../cn';
import { SongListItem } from './SongListItem';

export interface SongListProps {
  songList: SongData[];
  className?: string;
  onLikeChange: (id: string, liked: boolean) => void;
  scrollKey?: string;
}

export function SongList({
  songList,
  className,
  onLikeChange,
  scrollKey,
}: SongListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    parentRef.current?.scrollTo(0, 0);
  }, [scrollKey]);

  const rowVirtualizer = useVirtualizer({
    count: songList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

  return (
    <div ref={parentRef} className={cn('h-full overflow-y-auto', className)}>
      <div
        className="w-full relative"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const songData = songList[virtualItem.index];

          return (
            <div
              ref={rowVirtualizer.measureElement}
              key={songData.id}
              data-index={virtualItem.index}
              className="absolute top-0 left-0 w-full flex"
              style={{
                transform: `translateY(${
                  virtualItem.start - rowVirtualizer.options.scrollMargin
                }px)`,
              }}
            >
              <SongListItem songData={songData} onLikeChange={onLikeChange} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
