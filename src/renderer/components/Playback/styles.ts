import styled from 'styled-components';
import { Slider } from 'antd';
import themedark from '../../theme';

export const Wrapper = styled.div`
  display: flex;
  align-items: center;
  flex-grow: 1;

  & > * + * {
    margin-left: 20px;
  }
`;

export const PlaybackSlider = styled(Slider)`
  flex-grow: 1;
`;

export const PlaybackTime = styled.div`
  font-size: 12px;
  color: ${themedark.color.textMuted};
`;
