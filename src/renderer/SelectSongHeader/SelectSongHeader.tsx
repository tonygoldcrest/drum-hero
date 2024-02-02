import { Input } from 'antd';
import { Wrapper } from './styles';

export interface SelectSongHeaderProps {
  onChange: (value: string) => void;
  nameFilter: string;
}

export function SelectSongHeader({
  onChange,
  nameFilter,
}: SelectSongHeaderProps) {
  return (
    <Wrapper>
      <Input
        placeholder="Enter song name"
        value={nameFilter}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </Wrapper>
  );
}
