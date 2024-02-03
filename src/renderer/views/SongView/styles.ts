import { Layout, Typography } from 'antd';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import styled from 'styled-components';
import { theme } from '../../theme';

export const FullHeightLayout = styled(Layout)`
  height: 100%;
  pointer-events: all;
`;

export const SettingsItem = styled.div`
  display: flex;
  justify-content: center;
  padding: 10px 0;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;

  & > * + * {
    margin-left: 5px;
  }
`;

export const LayoutContent = styled(Content)`
  padding: 24px;
  margin: 0;
  overflow: scroll;
  display: flex;
  flex-flow: column;
  background: ${theme.color.foreground};
  border-radius: ${theme.borderRadius}px;
  box-shadow: ${theme.boxShadow.soft};
  color: ${theme.color.text.primary};
`;

export const SheetMusicView = styled.div`
  display: flex;
  flex-flow: column;
  align-items: center;
  min-width: max-content;
`;

export const Title = styled(Typography.Title)`
  margin: 0 auto;
`;

export const SettingsMenu = styled(Sider)`
  display: flex;
  flex-flow: column;
  padding: 10px;
  background: ${theme.color.foreground} !important;
`;

export const PlaybackContainer = styled.div`
  background: ${theme.color.foreground};
  border-radius: ${theme.borderRadius}px;
  box-shadow: ${theme.boxShadow.soft};
  margin-bottom: 5px;
  padding: 0 10px;
  display: flex;
  align-items: center;
`;

export const PlaybackTime = styled.div`
  font-size: 12px;
  color: ${theme.color.text.tertiary};
`;
