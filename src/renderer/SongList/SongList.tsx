import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { SongData } from '../types';
import { SongListItem } from '../SongListItem/SongListItem';
import { VirtualList, Wrapper } from './styles';

export interface SongListProps {
  songList: SongData[];
  className?: string;
}

export function SongList({ songList, className }: SongListProps) {
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
          const songInfo = songList[virtualItem.index];

          return (
            <SongListItem
              songInfo={songInfo}
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            />
          );
        })}
      </VirtualList>
    </Wrapper>
  );
}
