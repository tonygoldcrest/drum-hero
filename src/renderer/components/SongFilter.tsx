import { Input } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { cn } from '../cn';

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
    <div className={cn('grow', className)}>
      <Input
        prefix={
          <FontAwesomeIcon icon={faSearch} color="var(--color-text-dim)" />
        }
        placeholder="Enter song name"
        value={nameFilter}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        suffix={
          <div className="text-text-faint text-[13.5px]">
            {filteredSongsCount} results
          </div>
        }
      />
    </div>
  );
}
