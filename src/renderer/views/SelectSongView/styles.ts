import { FloatButton } from 'antd';
import styled from 'styled-components';
import themedark from '../../theme';

export const Wrapper = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${themedark.color.bg};
`;

export const SongViewOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
`;

export const SongListContainer = styled.div`
  width: 100%;
  max-width: 1000px;
  flex-grow: 1;
  overflow: hidden;
  margin: 0 auto;
  background: ${themedark.color.bg};
`;

export const Header = styled.div`
  background: ${themedark.color.headerGradient};
  border-bottom: 1px solid ${themedark.color.divider};

  padding: ${themedark.space.lg}px;
  z-index: 10;
  display: flex;
  flex-flow: column;
`;

export const ScanSongsButton = styled(FloatButton)`
  right: 94px;
  width: 60px;
  height: 60px;
  font-weight: bold;
  font-size: 20px;
  box-shadow: ${themedark.shadow.accentButton};
  border-radius: ${themedark.radius.md}px;

  & .ant-float-btn-body {
    border-radius: ${themedark.radius.md}px;
    background-image: ${themedark.color.accentGradient};
  }
`;
