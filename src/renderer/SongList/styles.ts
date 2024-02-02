import { Link } from 'react-router-dom';
import styled from 'styled-components';

export const SongListItem = styled(Link)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  border-bottom: 1px solid #e5e1da;
  padding: 10px;
  text-decoration: none;
  color: #333;
  background: #fbf9f1;
  align-items: center;

  &:hover {
    background: #e5e1da;
  }
`;

export const SongAlbum = styled.img`
  height: 100%;
  width: auto;
  object-fit: contain;
  aspect-ratio: 1;
  border-radius: 15px;
  border: 5px solid #92c7cf;
`;

export const SongMainInfo = styled.div`
  margin-left: 10px;
`;

export const SongName = styled.div`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
`;

export const SongArtist = styled.div``;
