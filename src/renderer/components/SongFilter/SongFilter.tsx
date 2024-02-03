import { Button, Input } from 'antd';
import { Wrapper } from './styles';

export interface SongFilterProps {
  onChange: (value: string) => void;
  nameFilter: string;
}

export function SongFilter({ onChange, nameFilter }: SongFilterProps) {
  return (
    <Wrapper>
      <Input
        placeholder="Enter song name"
        value={nameFilter}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <Button>Rescan Songs</Button>
    </Wrapper>
  );
}
