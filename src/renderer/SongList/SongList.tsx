import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { SongData } from '../types';
import {
  SongAlbum,
  SongArtist,
  SongListItem,
  SongMainInfo,
  SongName,
} from './styles';

export interface SongListProps {
  songList: SongData[];
}

export function SongList({ songList }: SongListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: songList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const { song, albumCover, id } = songList[virtualItem.index];

          return (
            <SongListItem
              to={{ pathname: `/${id}` }}
              key={id}
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <SongAlbum src={albumCover} />
              <SongMainInfo>
                <SongName>{song.name}</SongName>
                <SongArtist>{song.artist}</SongArtist>
              </SongMainInfo>
            </SongListItem>
          );
        })}
      </div>
    </div>
  );
}
