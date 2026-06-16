import { faS, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FileName } from './styles';
import { Button, Slider } from 'antd';

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
    <>
      <FileName>{name}</FileName>
      <Slider value={volume} onChange={onChange} />
      <Button
        type={isMuted ? 'primary' : 'default'}
        size="small"
        icon={<FontAwesomeIcon size="xs" icon={faVolumeMute} />}
        onClick={onMuteClick}
      />
      <Button
        type={isSoloed ? 'primary' : 'default'}
        size="small"
        icon={<FontAwesomeIcon size="xs" icon={faS} />}
        onClick={onSoloClick}
      />
    </>
  );
}
