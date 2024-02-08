import styled from 'styled-components';
import { Slider } from 'antd';
import { theme } from '../../theme';

export const Wrapper = styled.div`
  background: ${theme.color.foreground};
  border-radius: ${theme.borderRadius}px;
  box-shadow: ${theme.boxShadow.soft};
  margin-bottom: 5px;
  padding: 0 10px;
  display: flex;
  align-items: center;
`;

export const PlaybackSlider = styled(Slider)`
  flex-grow: 1;
`;

export const PlaybackTime = styled.div`
  font-size: 12px;
  color: ${theme.color.text.tertiary};
`;
