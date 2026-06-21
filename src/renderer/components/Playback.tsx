import { Progress, Slider } from 'antd';
import { formatTime } from '../util';

export interface PlaybackProps {
  currentTime: number;
  duration: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  isDev: boolean;
}

export function Playback({
  currentTime,
  duration,
  onChange,
  disabled,
  isDev,
}: PlaybackProps) {
  return (
    <div className="flex items-center grow gap-5">
      <div className="text-xs text-text-muted">{formatTime(currentTime)}</div>
      {isDev ? (
        <Slider
          className="grow"
          defaultValue={0}
          disabled={disabled}
          tooltip={{ open: false }}
          value={(currentTime / duration) * 100}
          onChange={onChange}
        />
      ) : (
        <Progress percent={(currentTime / duration) * 100} showInfo={false} />
      )}
      <div className="text-xs text-text-muted">{formatTime(duration)}</div>
    </div>
  );
}
