import { FloatButton } from 'antd';
import styled from 'styled-components';
import { theme } from '../../theme';

export const Wrapper = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${theme.color.background};
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
  box-shadow: ${theme.boxShadow.soft};
  background: ${theme.color.foreground};
`;

export const Header = styled.div`
  background: ${theme.color.primaryDark};

  padding: 20px;
  z-index: 10;
  box-shadow: ${theme.boxShadow.soft};
  display: flex;
  flex-flow: column;
`;

export const SongNumber = styled.div`
  margin-left: auto;
  color: ${theme.color.foreground};
  font-size: 12px;
`;

export const ScanSongsButton = styled(FloatButton)`
  right: 94px;
  width: 60px;
  height: 60px;
  box-shadow: ${theme.boxShadow.soft};
  font-weight: bold;
  font-size: 20px;
`;
