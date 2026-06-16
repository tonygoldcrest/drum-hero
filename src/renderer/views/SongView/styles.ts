import { Button, Layout, Select } from 'antd';
import Sider from 'antd/es/layout/Sider';
import { Content } from 'antd/es/layout/layout';
import styled from 'styled-components';
import themedark, { theme } from '../../theme';

export const FullHeightLayout = styled(Layout)`
  height: 100%;
  pointer-events: all;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  background: ${themedark.color.headerGradient};
  padding: ${themedark.space.lg}px;

  & > * + * {
    margin-left: 20px;
  }
`;

export const SongInfo = styled.div``;

export const SongTitle = styled.div`
  color: ${themedark.color.textBody};
  font-family: ${themedark.font.ui};
  font-size: 18px;
`;

export const SongSecondary = styled.div`
  color: ${themedark.color.textFaint};
  display: flex;
  align-items: center;

  & > * + * {
    margin-left: 5px;
  }
`;

export const PlayButton = styled(Button)`
  width: 50px !important;
  height: 50px !important;
`;

export const LayoutContent = styled(Content)`
  padding: 24px;
  margin: 0;
  overflow: auto;
  display: flex;
  flex-flow: column;
  align-items: center;
  font-family: ${themedark.font.display};
  color: ${themedark.color.ink};
`;

export const Title = styled.h1`
  margin: 0 auto;
  font-size: ${themedark.fontSize.sheetTitle}px;
`;

export const Subtitle = styled.div`
  margin-left: auto;
  font-size: ${themedark.fontSize.body}px;
  font-style: italic;
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
  background: ${themedark.color.paper};
  border-radius: ${themedark.radius.md}px;
  padding: 40px;
`;

export const Sidebar = styled(Sider)`
  display: flex;
  flex-flow: column;
  padding: 10px;
  background: ${themedark.color.surface} !important;
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
