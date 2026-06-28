import { Button, Divider, Input } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faGlobe, faSearch } from '@fortawesome/free-solid-svg-icons';
import { Difficulty } from 'scan-chart';
import { cn } from '../../cn';
import { Tooltip } from '../Tooltip';

export type Mode = 'local' | 'online';

export interface SongFilterProps {
  onChangeFilter: (value: string) => void;
  nameFilter: string;
  className?: string;
  difficulty: Difficulty;
  filteredSongsCount: number;
  mode: Mode;
  onChangeMode: (value: Mode) => void;
}

export function SongFilter({
  onChangeFilter: onChange,
  onChangeMode,
  mode = 'local',
  nameFilter,
  className,
  difficulty,
  filteredSongsCount,
}: SongFilterProps) {
  const options = [
    {
      icon: <FontAwesomeIcon icon={faFolder} />,
      value: 'local',
      tooltipText: "Songs you've already got on your machine",
    },
    {
      icon: <FontAwesomeIcon icon={faGlobe} />,
      value: 'online',
      tooltipText: 'Go hunting for new songs to download',
    },
  ] as const;

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
          <div className="flex gap-1 items-center">
            <div className="text-text-faint text-[13.5px] capitalize">
              {difficulty}
            </div>

            <Divider vertical />

            <div className="text-text-faint text-[13.5px]">
              {filteredSongsCount} results
            </div>

            <Divider vertical />

            <div className="flex gap-2 items-center">
              {options.map((option) => (
                <Tooltip
                  key={option.value}
                  title={option.tooltipText}
                  placement="bottomLeft"
                >
                  <Button
                    className="grow"
                    type={mode === option.value ? 'primary' : 'default'}
                    icon={option.icon}
                    data-testid={`mode-${option.value}`}
                    onClick={() => onChangeMode(option.value)}
                  ></Button>
                </Tooltip>
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
}
