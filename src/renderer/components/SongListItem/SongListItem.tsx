import { CSSProperties } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartSimple,
  faHeart as faHeartSolid,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart } from '@fortawesome/free-regular-svg-icons';
import {
  AdditionalInfo,
  Album,
  Artist,
  Like,
  Info,
  MainInfo,
  Name,
  Parameter,
  Value,
  Wrapper,
} from './styles';
import { SongData } from '../../../types';

export interface SongListItemProps {
  songData: SongData;
  style: CSSProperties;
  onLikeChange: (id: string, liked: boolean) => void;
}

export function SongListItem({
  songData: { albumCover, id, name, artist, charter, diff_drums, liked },
  style,
  onLikeChange,
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
        {diff_drums && (
          <Info>
            <Parameter>
              <FontAwesomeIcon size="lg" icon={faChartSimple} />
            </Parameter>
            <Value>{diff_drums}</Value>
          </Info>
        )}
      </AdditionalInfo>
      <Like
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLikeChange(id, !liked);
        }}
      >
        {liked ? (
          <FontAwesomeIcon size="lg" icon={faHeartSolid} />
        ) : (
          <FontAwesomeIcon size="lg" icon={faHeart} />
        )}
      </Like>
    </Wrapper>
  );
}
