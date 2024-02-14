import styled from 'styled-components';
import { Button, Slider } from 'antd';
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
    margin-left: 5px;
  }
`;

export const VolumeSlider = styled(Slider)`
  flex-grow: 1;
`;

export const VolumeControlButton = styled(Button)`
  &.ant-btn.ant-btn-sm {
    width: 20px;
    min-width: 20px;
    height: 20px;
    padding: 0;
    line-height: 0;
  }
`;
