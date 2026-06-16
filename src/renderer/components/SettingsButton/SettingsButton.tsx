import { ReactNode, useRef, type RefObject, useEffect } from 'react';
import { Switch } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog } from '@fortawesome/free-solid-svg-icons';
import { Difficulty } from '../../../chart-parser/types';
import { PLAYHEAD_STYLES, PlayheadStyle } from '../../views/SongView/types';
import {
  TriggerButton,
  PopoverPanel,
  Row,
  Label,
  SettingSelect,
  VolumeSliders,
  MixerDivider,
  MixerSeparator,
  MixerTitle,
} from './styles';

interface Props {
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  playheadStyle: PlayheadStyle;
  onPlayheadStyleChange: (s: PlayheadStyle) => void;
  enableColors: boolean;
  onEnableColorsChange: (v: boolean) => void;
  showBarNumbers: boolean;
  onShowBarNumbersChange: (v: boolean) => void;
  volumeSliders?: ReactNode[];
}

export function SettingsButton({
  difficulty,
  onDifficultyChange,
  playheadStyle,
  onPlayheadStyleChange,
  enableColors,
  onEnableColorsChange,
  showBarNumbers,
  onShowBarNumbersChange,
  volumeSliders,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = popoverRef.current;

    if (!el) {
      return;
    }
    el.showPopover();
  });

  const toggle = () => {
    const el = popoverRef.current;

    if (!el) {
      return;
    }

    if (el.matches(':popover-open')) {
      el.hidePopover();
    } else {
      el.showPopover();
    }
  };

  return (
    <>
      <TriggerButton
        ref={triggerRef as RefObject<HTMLButtonElement>}
        icon={<FontAwesomeIcon icon={faCog} />}
        onClick={toggle}
        size="large"
      />
      <PopoverPanel ref={popoverRef} popover="manual">
        <Row>
          <Label>Difficulty</Label>
          <SettingSelect
            value={difficulty}
            options={Object.values(Difficulty).map((d) => ({
              value: d,
              label: d,
            }))}
            onChange={(v) => onDifficultyChange(v as Difficulty)}
          />
        </Row>
        <Row>
          <Label>Playhead style</Label>
          <SettingSelect
            value={playheadStyle}
            options={PLAYHEAD_STYLES.map((s) => ({ value: s, label: s }))}
            onChange={(v) => onPlayheadStyleChange(v as PlayheadStyle)}
          />
        </Row>
        <Row>
          <Label>Enable colors</Label>
          <Switch
            size="small"
            checked={enableColors}
            onChange={onEnableColorsChange}
          />
        </Row>
        <Row>
          <Label>Show bar numbers</Label>
          <Switch
            size="small"
            checked={showBarNumbers}
            onChange={onShowBarNumbersChange}
          />
        </Row>
        {volumeSliders ? (
          <>
            <MixerSeparator>
              <MixerTitle>Mixer</MixerTitle>
              <MixerDivider />
            </MixerSeparator>
            <VolumeSliders>{volumeSliders}</VolumeSliders>
          </>
        ) : null}
      </PopoverPanel>
    </>
  );
}
