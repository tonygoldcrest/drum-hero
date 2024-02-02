import { CSSProperties } from 'react';
import { SongData } from '../types';
import {
  AdditionalInfo,
  Album,
  Artist,
  Info,
  MainInfo,
  Name,
  Parameter,
  Value,
  Wrapper,
} from './styles';

export interface SongListItemProps {
  songInfo: SongData;
  style: CSSProperties;
}

export function SongListItem({
  songInfo: { albumCover, song, id },
  style,
}: SongListItemProps) {
  return (
    <Wrapper to={{ pathname: `/${id}` }} style={style}>
      <Album src={albumCover} />
      <MainInfo>
        <Name>{song.name}</Name>
        <Artist>{song.artist}</Artist>
      </MainInfo>
      <AdditionalInfo>
        {song.charter && (
          <Info>
            <Parameter>charter:</Parameter>
            <Value>{song.charter.replace(/<\S+?>/g, '')}</Value>
          </Info>
        )}
      </AdditionalInfo>
    </Wrapper>
  );
}
