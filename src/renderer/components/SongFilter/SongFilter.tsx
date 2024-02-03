import { Input } from 'antd';
import { Wrapper } from './styles';

export interface SongFilterProps {
  onChange: (value: string) => void;
  nameFilter: string;
  className?: string;
}

export function SongFilter({
  onChange,
  nameFilter,
  className,
}: SongFilterProps) {
  return (
    <Wrapper className={className}>
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
