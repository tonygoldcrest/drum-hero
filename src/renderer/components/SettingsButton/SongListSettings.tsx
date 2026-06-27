import { Button, Divider, Progress } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faDrum,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';
import { Difficulty } from 'scan-chart';
import { StemToolsPanel } from '../../context/StemToolsContext';

const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

interface Props {
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  currentPath: string | null;
  onSelectFolder: () => void;
  onRescan: () => void;
  scanPercent?: number;
  onSetupInput: () => void;
}

export function SongListSettings({
  difficulty,
  onDifficultyChange,
  currentPath,
  onSelectFolder,
  onRescan,
  scanPercent,
  onSetupInput,
}: Props) {
  return (
    <>
      <div className="flex gap-2 grow">
        <Button
          icon={<FontAwesomeIcon icon={faFolder} />}
          onClick={onSelectFolder}
          title={currentPath ?? undefined}
          className="grow"
        >
          {currentPath ? currentPath.split(/[\\/]/).pop() : 'Select folder'}
        </Button>
        {currentPath ? (
          <Button
            icon={<FontAwesomeIcon icon={faArrowsRotate} />}
            data-testid="rescan-folder"
            onClick={onRescan}
          />
        ) : null}
      </div>
      {scanPercent !== undefined && (
        <div className="flex flex-col gap-1" data-testid="scan-progress">
          <div className="text-sm text-text-muted">Scanning songs</div>
          <Progress percent={scanPercent} />
        </div>
      )}

      <Divider />

      <Button icon={<FontAwesomeIcon icon={faDrum} />} onClick={onSetupInput}>
        Setup input
      </Button>

      <Divider />

      <div className="flex flex-col gap-3">
        <div className="text-sm text-text-muted whitespace-nowrap">
          Difficulty
        </div>
        <div className="flex gap-2">
          {ALL_DIFFICULTIES.map((d) => (
            <Button
              key={d}
              className="grow capitalize"
              type={difficulty === d ? 'primary' : 'default'}
              data-testid={`difficulty-${d}`}
              onClick={() => onDifficultyChange(d)}
            >
              {d}
            </Button>
          ))}
        </div>
      </div>

      <Divider />

      <StemToolsPanel />
    </>
  );
}
