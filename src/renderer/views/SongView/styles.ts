import { Layout } from 'antd';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import styled from 'styled-components';

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

export const SheetMusicView = styled(Content)<{
  background: string;
  borderRadius: number;
}>`
  padding: 24px;
  margin: 0;
  overflow: scroll;
  display: flex;
  flex-flow: column;
  align-items: center;
  background: ${(props) => props.background};
  border-radius: ${(props) => props.borderRadius}px;
  box-shadow:
    rgba(60, 64, 67, 0.3) 0px 1px 2px 0px,
    rgba(60, 64, 67, 0.15) 0px 1px 3px 1px;
`;

export const SettingsMenu = styled(Sider)`
  display: flex;
  flex-flow: column;
  padding: 10px;
`;
