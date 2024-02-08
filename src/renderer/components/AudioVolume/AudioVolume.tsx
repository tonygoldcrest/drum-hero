import { Slider } from 'antd';
import { FileName, Wrapper } from './styles';

export interface AudioVolumeProps {
  name: string;
  volume: number;
  onChange: (value: number) => void;
}

export function AudioVolume({ name, volume, onChange }: AudioVolumeProps) {
  return (
    <Wrapper>
      <FileName>{name}</FileName>
      <Slider defaultValue={volume * 100} onChange={onChange} />
    </Wrapper>
  );
}
