import { Link } from 'react-router-dom';
import styled from 'styled-components';
import themedark from '../../theme';

export const Container = styled.div`
  padding: 5px;
  width: 100%;
`;

export const Wrapper = styled(Link)`
  width: 100%;
  display: flex;
  border: 1px solid ${themedark.color.borderSoft};
  padding: 10px;
  text-decoration: none;
  background: ${themedark.color.surface};
  align-items: center;
  border-radius: ${themedark.radius.md}px;
  transition: all 0.1s ease-in-out;

  &:hover {
    background: ${themedark.color.accentSoftBg};
    border: 1px solid ${themedark.color.accentSoftBorder};
  }
`;

export const Album = styled.img`
  height: 60px;
  width: auto;
  object-fit: contain;
  aspect-ratio: 1;
  border-radius: ${themedark.radius.md}px;
  box-shadow: ${themedark.shadow.frame};
`;

export const MainInfo = styled.div`
  margin-left: 10px;
`;

export const Name = styled.div`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
  color: ${themedark.color.textBody};
  font-family: ${themedark.font.display};
`;

export const Artist = styled.div`
  color: ${themedark.color.textMuted};
  font-family: ${themedark.font.ui};
  font-size: 14px;
`;

export const RightContainer = styled.div`
  display: flex;
  margin-left: auto;
  align-items: center;

  & > * + * {
    margin-left: 20px;
  }
`;

export const Info = styled.div`
  display: flex;
  align-items: flex-end;
  flex-flow: column;
`;

export const Parameter = styled.div`
  color: ${themedark.color.textDim};
  font-size: 12px;
`;

export const Value = styled.div`
  color: ${themedark.color.textMuted};
  font-size: 14px;
  margin-top: 5px;
`;

export const Like = styled.button<{ liked: boolean }>`
  background: none;
  padding: 0;
  border: 0;
  cursor: pointer;
  color: ${(props) =>
    props.liked ? themedark.color.accent : themedark.color.textDim};

  &:hover {
    color: ${themedark.color.accentHover} !important;
  }
`;

export const Difficulty = styled.div`
  display: flex;
  align-items: center;

  & > * + * {
    margin-left: 5px;
  }
`;

export const DifficultyBox = styled.div<{ filled: boolean }>`
  width: 7px;
  height: 5px;
  background: ${(props) =>
    props.filled ? themedark.color.accent : themedark.color.textDimmer};
  border-radius: ${themedark.radius.xs}px;
`;

export const DifficultyValue = styled.div`
  color: ${themedark.color.textMuted};
  font-size: 13px;
  margin-left: 10px;
`;
