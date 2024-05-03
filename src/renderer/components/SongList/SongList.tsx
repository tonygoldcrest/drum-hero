import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { VirtualList, VirtualListItem, Wrapper } from './styles';
import { SongListItem } from '../SongListItem/SongListItem';
import { SongData } from '../../../types';

export interface SongListProps {
  songList: SongData[];
  className?: string;
  onLikeChange: (id: string, liked: boolean) => void;
}

export function SongList({ songList, className, onLikeChange }: SongListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: songList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

  return (
    <Wrapper ref={parentRef} className={className}>
      <VirtualList
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const songData = songList[virtualItem.index];

          return (
            <VirtualListItem
              ref={rowVirtualizer.measureElement}
              key={songData.id}
              data-index={virtualItem.index}
              style={{
                transform: `translateY(${
                  virtualItem.start - rowVirtualizer.options.scrollMargin
                }px)`,
              }}
            >
              <SongListItem songData={songData} onLikeChange={onLikeChange} />
            </VirtualListItem>
          );
        })}
      </VirtualList>
    </Wrapper>
  );
}
