import { Input } from 'antd';
import { Wrapper, SongCount } from './styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import themedark from '../../theme';

export interface SongFilterProps {
  onChange: (value: string) => void;
  nameFilter: string;
  className?: string;
  filteredSongsCount: number;
}

export function SongFilter({
  onChange,
  nameFilter,
  className,
  filteredSongsCount,
}: SongFilterProps) {
  return (
    <Wrapper className={className}>
      <Input
        prefix={
          <FontAwesomeIcon icon={faSearch} color={themedark.color.textDim} />
        }
        placeholder="Enter song name"
        value={nameFilter}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        suffix={<SongCount>{filteredSongsCount} results</SongCount>}
      />
    </Wrapper>
  );
}
