import { faS, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  FileName,
  VolumeControl,
  VolumeControlButton,
  VolumeSlider,
  Wrapper,
} from './styles';

export interface AudioVolumeProps {
  name: string;
  volume: number;
  isMuted: boolean;
  isSoloed: boolean;
  onChange: (value: number) => void;
  onSoloClick: () => void;
  onMuteClick: () => void;
}

export function AudioVolume({
  name,
  volume,
  onChange,
  isMuted,
  isSoloed,
  onSoloClick,
  onMuteClick,
}: AudioVolumeProps) {
  return (
    <Wrapper>
      <FileName>{name}</FileName>
      <VolumeControl>
        <VolumeSlider value={volume} onChange={onChange} />
        <VolumeControlButton
          shape="circle"
          type={isMuted ? 'primary' : 'default'}
          size="small"
          icon={<FontAwesomeIcon size="xs" icon={faVolumeMute} />}
          onClick={onMuteClick}
        />
        <VolumeControlButton
          shape="circle"
          type={isSoloed ? 'primary' : 'default'}
          size="small"
          icon={<FontAwesomeIcon size="xs" icon={faS} />}
          onClick={onSoloClick}
        />
      </VolumeControl>
    </Wrapper>
  );
}
