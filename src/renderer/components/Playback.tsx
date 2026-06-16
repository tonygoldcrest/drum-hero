import { Slider } from 'antd';
import { formatTime } from '../util';

export interface PlaybackProps {
  currentTime: number;
  duration: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function Playback({
  currentTime,
  duration,
  onChange,
  disabled,
}: PlaybackProps) {
  return (
    <div className="flex items-center grow gap-5">
      <div className="text-xs text-text-muted">{formatTime(currentTime)}</div>
      <Slider
        defaultValue={0}
        disabled={disabled}
        tooltip={{ open: false }}
        style={{ flexGrow: 1 }}
        value={(currentTime / duration) * 100}
        onChange={onChange}
      />
      <div className="text-xs text-text-muted">{formatTime(duration)}</div>
    </div>
  );
}
