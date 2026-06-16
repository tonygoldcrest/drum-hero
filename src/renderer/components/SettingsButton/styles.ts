import styled from 'styled-components';
import { Button, Select } from 'antd';
import themedark from '../../theme';

export const TriggerButton = styled(Button)`
  anchor-name: --settings-trigger;
`;

export const PopoverPanel = styled.div.withConfig({
  shouldForwardProp: () => true,
})`
  border: 1px solid ${themedark.color.border};
  padding: ${themedark.space.md}px;
  background: ${themedark.color.headerGradient};
  border-radius: ${themedark.radius.md}px;
  box-shadow: ${themedark.shadow.panel};
  font-family: ${themedark.font.ui};

  position: fixed;
  position-anchor: --settings-trigger;
  inset: unset;
  margin: unset;
  top: calc(anchor(bottom) + 8px);
  right: anchor(right);
  min-width: 360px;

  &:popover-open {
    display: flex;
    flex-flow: column;
    gap: ${themedark.space.sm}px;
  }
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

export const VolumeSliders = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr max-content max-content;
  align-items: center;
  column-gap: 10px;
  row-gap: 5px;
`;

export const MixerSeparator = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

export const MixerDivider = styled.div`
  flex-grow: 1;
  background: ${themedark.color.accentGradientFade};
  height: 1px;
`;

export const MixerTitle = styled.div`
  color: ${themedark.color.accentText};
  text-transform: uppercase;
  font-weight: 600;
  font-size: 13px;
`;
