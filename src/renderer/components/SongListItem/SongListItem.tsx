import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartSimple,
  faHeart as faHeartSolid,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart } from '@fortawesome/free-regular-svg-icons';
import { times } from 'es-toolkit/compat';
import appIcon from '../../../../assets/icon.png';
import {
  Album,
  Artist,
  Like,
  Container,
  Info,
  MainInfo,
  Name,
  Parameter,
  Value,
  Wrapper,
  RightContainer,
  Difficulty,
  DifficultyBox,
  DifficultyValue,
} from './styles';
import { SongData } from '../../../types';

export interface SongListItemProps {
  songData: SongData;
  onLikeChange: (id: string, liked: boolean) => void;
}

export function SongListItem({
  songData: { albumCover, id, name, artist, charter, diff_drums, liked },
  onLikeChange,
}: SongListItemProps) {
  return (
    <Container>
      <Wrapper to={{ pathname: `/${id}` }}>
        <Album
          src={albumCover ?? appIcon}
          onError={(e) => {
            e.currentTarget.src = appIcon;
          }}
        />

        <MainInfo>
          <Name>{name}</Name>
          <Artist>{artist}</Artist>
        </MainInfo>

        <RightContainer>
          {charter && (
            <Info>
              <Parameter>charter</Parameter>
              <Value>{charter.replace(/<\S+?>/g, '')}</Value>
            </Info>
          )}

          {diff_drums && (
            <Difficulty>
              {times(5, (i) => (
                <DifficultyBox key={i} filled={i < Number(diff_drums)} />
              ))}
              <DifficultyValue>{diff_drums}</DifficultyValue>
            </Difficulty>
          )}

          <Like
            liked={!!liked}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLikeChange(id, !liked);
            }}
          >
            <FontAwesomeIcon size="xl" icon={liked ? faHeartSolid : faHeart} />
          </Like>
        </RightContainer>
      </Wrapper>
    </Container>
  );
}
