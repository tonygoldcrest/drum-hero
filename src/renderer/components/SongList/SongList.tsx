import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { VirtualList, Wrapper } from './styles';
import { SongListItem } from '../SongListItem/SongListItem';
import { SongData } from '../../../types';

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
          const songData = songList[virtualItem.index];

          return (
            <SongListItem
              songData={songData}
              key={songData.id}
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
