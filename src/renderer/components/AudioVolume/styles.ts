import styled from 'styled-components';
import { Slider } from 'antd';
import { theme } from '../../theme';

export const Wrapper = styled.div`
  flex-grow: 1;
  margin: 0 3px;
  padding: 5px 10px;
  border-radius: ${theme.borderRadius}px;
  box-shadow: ${theme.boxShadow.soft};
`;

export const FileName = styled.div`
  text-transform: capitalize;
  font-size: 12px;
  color: ${theme.color.text.secondary};
`;

export const VolumeControl = styled.div`
  display: flex;
  align-items: center;

  & > * + * {
    margin-left: 7px;
  }
`;

export const VolumeSlider = styled(Slider)`
  flex-grow: 1;
`;
