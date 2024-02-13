import { Button } from 'antd';
import { faS, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FileName, VolumeControl, VolumeSlider, Wrapper } from './styles';

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
        <Button
          shape="circle"
          type={isMuted ? 'primary' : 'default'}
          size="small"
          icon={<FontAwesomeIcon icon={faVolumeMute} />}
          onClick={onMuteClick}
        />
        <Button
          shape="circle"
          type={isSoloed ? 'primary' : 'default'}
          size="small"
          icon={<FontAwesomeIcon icon={faS} />}
          onClick={onSoloClick}
        />
      </VolumeControl>
    </Wrapper>
  );
}
