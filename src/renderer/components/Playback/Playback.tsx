import { formatTime } from '../../util';
import { PlaybackSlider, PlaybackTime, Wrapper } from './styles';

export interface PlaybackProps {
  currentTime: number;
  duration: number;
  onChange: (value: number) => void;
}

export function Playback({ currentTime, duration, onChange }: PlaybackProps) {
  return (
    <Wrapper>
      <PlaybackSlider
        defaultValue={0}
        tooltip={{ open: false }}
        style={{
          flexGrow: 1,
        }}
        value={(currentTime / duration) * 100}
        onChange={onChange}
      />
      <PlaybackTime>
        {formatTime(currentTime)} / {formatTime(duration)}
      </PlaybackTime>
    </Wrapper>
  );
}
