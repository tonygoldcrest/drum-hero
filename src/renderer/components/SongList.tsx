import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';
import { SongData } from '../../types';
import { cn } from '../cn';
import { SongListItem } from './SongListItem';
import { Mode } from './SongFilter';

export interface SongListProps {
  songList: SongData[];
  className?: string;
  onLikeChange: (id: string, liked: boolean) => void;
  onDownload: (id: string) => void;
  downloadingIds?: Set<string>;
  downloadedIds?: Set<string>;
  scrollKey?: string;
  mode: Mode;
  downloadingDisabled: boolean;
}

export function SongList({
  songList,
  className,
  onLikeChange,
  onDownload,
  downloadingIds,
  downloadedIds,
  scrollKey,
  mode,
  downloadingDisabled,
}: SongListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    parentRef.current?.scrollTo(0, 0);
  }, [scrollKey]);

  const rowVirtualizer = useVirtualizer({
    count: songList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 85,
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
              className="absolute top-0 left-0 w-full flex items-center"
              style={{
                transform: `translateY(${
                  virtualItem.start - rowVirtualizer.options.scrollMargin
                }px)`,
                height: `${virtualItem.size}px`,
              }}
            >
              <SongListItem
                songData={songData}
                onLikeChange={onLikeChange}
                onDownload={onDownload}
                downloading={downloadingIds?.has(songData.id)}
                downloaded={downloadedIds?.has(songData.id)}
                mode={mode}
                downloadingDisabled={downloadingDisabled}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
