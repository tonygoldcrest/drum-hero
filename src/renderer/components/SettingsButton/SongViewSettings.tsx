import { ReactNode } from 'react';
import { Button, Divider, Switch } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDrum } from '@fortawesome/free-solid-svg-icons';
import { PLAYHEAD_STYLES, PlayheadStyle } from '../../types';

interface Props {
  playheadStyle: PlayheadStyle;
  onPlayheadStyleChange: (style: PlayheadStyle) => void;
  enableColors: boolean;
  onEnableColorsChange: (value: boolean) => void;
  showBarNumbers: boolean;
  onShowBarNumbersChange: (value: boolean) => void;
  showTempo: boolean;
  onShowTempoChange: (value: boolean) => void;
  countIn: boolean;
  onCountInChange: (value: boolean) => void;
  isDev: boolean;
  onSetupInput: () => void;
  volumeSliders?: ReactNode[];
  currentInputName?: string;
}

export function SongViewSettings({
  playheadStyle,
  onPlayheadStyleChange,
  enableColors,
  onEnableColorsChange,
  showBarNumbers,
  onShowBarNumbersChange,
  showTempo,
  onShowTempoChange,
  countIn,
  onCountInChange,
  isDev,
  onSetupInput,
  volumeSliders,
  currentInputName,
}: Props) {
  return (
    <>
      <Button icon={<FontAwesomeIcon icon={faDrum} />} onClick={onSetupInput}>
        {currentInputName ?? 'Setup input'}
      </Button>

      <Divider />

      <div className="flex flex-col gap-3">
        <div className="text-sm text-text-muted whitespace-nowrap">
          Playhead style
        </div>

        <div className="flex gap-2">
          {PLAYHEAD_STYLES.map((s) => (
            <Button
              key={s}
              className="grow"
              type={playheadStyle === s ? 'primary' : 'default'}
              onClick={() => onPlayheadStyleChange(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <Divider />

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-text-muted whitespace-nowrap">
          Enable colors
        </div>
        <Switch
          size="small"
          checked={enableColors}
          onChange={onEnableColorsChange}
        />
      </div>
      {isDev && (
        <>
          <Divider />
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-text-muted whitespace-nowrap">
              Show bar numbers
            </div>
            <Switch
              size="small"
              checked={showBarNumbers}
              onChange={onShowBarNumbersChange}
            />
          </div>
        </>
      )}

      <Divider />

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-text-muted whitespace-nowrap">
          Show tempo
        </div>
        <Switch size="small" checked={showTempo} onChange={onShowTempoChange} />
      </div>

      <Divider />

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-text-muted whitespace-nowrap">
          Count-in
        </div>
        <Switch size="small" checked={countIn} onChange={onCountInChange} />
      </div>

      {volumeSliders ? (
        <>
          <div className="flex items-center gap-3">
            <div
              className="grow h-px"
              style={{ background: 'var(--gradient-accent-fade-reverse)' }}
            />
            <div className="text-accent-text uppercase font-semibold text-[13px]">
              Mixer
            </div>
            <div
              className="grow h-px"
              style={{ background: 'var(--gradient-accent-fade)' }}
            />
          </div>
          <div className="grid grid-cols-[max-content_1fr_max-content_max-content] items-center gap-x-2 gap-y-1">
            {volumeSliders}
          </div>
        </>
      ) : null}
    </>
  );
}
