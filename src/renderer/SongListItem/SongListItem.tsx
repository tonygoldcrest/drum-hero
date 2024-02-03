import { CSSProperties } from 'react';
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
import { SongData } from '../../types';

export interface SongListItemProps {
  songData: SongData;
  style: CSSProperties;
}

export function SongListItem({
  songData: { albumCover, id, name, artist, charter },
  style,
}: SongListItemProps) {
  return (
    <Wrapper to={{ pathname: `/${id}` }} style={style}>
      <Album src={albumCover} />
      <MainInfo>
        <Name>{name}</Name>
        <Artist>{artist}</Artist>
      </MainInfo>
      <AdditionalInfo>
        {charter && (
          <Info>
            <Parameter>charter:</Parameter>
            <Value>{charter.replace(/<\S+?>/g, '')}</Value>
          </Info>
        )}
      </AdditionalInfo>
    </Wrapper>
  );
}
