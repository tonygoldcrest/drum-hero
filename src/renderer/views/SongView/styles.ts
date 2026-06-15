import { Layout, Select, Typography } from 'antd';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import styled from 'styled-components';
import { theme } from '../../theme';

export const FullHeightLayout = styled(Layout)`
  height: 100%;
  pointer-events: all;
`;

export const LayoutContent = styled(Content)`
  padding: 24px;
  margin: 0;
  overflow: auto;
  display: flex;
  flex-flow: column;
  align-items: center;
  background: ${theme.color.foreground};
  border-radius: ${theme.borderRadius}px;
  box-shadow: ${theme.boxShadow.soft};
  color: ${theme.color.text.primary};
`;

export const Title = styled(Typography.Title)`
  margin: 0 auto;
`;

export const Subtitle = styled.div`
  margin-left: auto;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  flex-flow: column;
  align-items: flex-end;
`;

export const SheetMusicView = styled.div`
  display: flex;
  flex-flow: column;
  align-items: center;
  min-width: max-content;
`;

export const Sidebar = styled(Sider)`
  display: flex;
  flex-flow: column;
  padding: 10px;
  background: ${theme.color.foreground} !important;
  box-shadow: ${theme.boxShadow.soft};
`;

export const SecondaryText = styled.div`
  font-size: 12px;
  color: ${theme.color.text.tertiary};
`;

export const SelectWrapper = styled.div`
  display: flex;
  flex-grow: 1;
  flex-flow: column;
`;

export const StyledSelect = styled(Select)`
  flex-grow: 1;
  margin-top: 3px;
`;
