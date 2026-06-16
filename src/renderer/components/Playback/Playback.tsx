import { formatTime } from '../../util';
import { PlaybackSlider, PlaybackTime, Wrapper } from './styles';

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
    <Wrapper>
      <PlaybackTime>{formatTime(currentTime)}</PlaybackTime>
      <PlaybackSlider
        defaultValue={0}
        disabled={disabled}
        tooltip={{ open: false }}
        style={{
          flexGrow: 1,
        }}
        value={(currentTime / duration) * 100}
        onChange={onChange}
      />
      <PlaybackTime>{formatTime(duration)}</PlaybackTime>
    </Wrapper>
  );
}
