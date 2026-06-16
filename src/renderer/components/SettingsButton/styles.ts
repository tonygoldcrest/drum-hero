import styled from 'styled-components';
import { Button, Select } from 'antd';
import themedark from '../../theme';

export const TriggerButton = styled(Button)``;

export const PopoverPanel = styled.div`
  border: 1px solid ${themedark.color.border};
  padding: ${themedark.space.lg}px;
  background: ${themedark.color.surfaceRaised};
  border-radius: ${themedark.radius.md}px;
  box-shadow: ${themedark.shadow.panel};

  position: fixed;
  inset: auto;
  margin: unset;
  top: calc(anchor(bottom) + 8px);
  right: calc(100vw - anchor(right));

  display: flex;
  flex-flow: column;
  gap: ${themedark.space.md}px;
  min-width: 240px;
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${themedark.space.md}px;
`;

export const Label = styled.div`
  font-size: ${themedark.fontSize.label}px;
  color: ${themedark.color.textMuted};
  white-space: nowrap;
`;

export const SettingSelect = styled(Select)`
  min-width: 120px;
` as typeof Select;
