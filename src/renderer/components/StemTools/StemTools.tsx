import {
  faDownload,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Progress } from 'antd';
import { StemToolsPhase, StemToolsStatus } from '../../../types';
import { IconButton } from '../IconButton';
import { Tooltip } from '../Tooltip';

function formatSize(bytes?: number): string {
  if (!bytes) {
    return '';
  }

  const mb = bytes / 1_000_000;

  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

interface Props {
  stemToolsStatus?: StemToolsStatus;
  stemToolsLoading?: boolean;
  downloadPercent?: number;
  phase?: StemToolsPhase;
  installedVersion?: string;
  latestVersion?: string;
  updateAvailable?: boolean;
  available?: boolean;
  downloadSize?: number;
  uncompressedSize?: number;
  onDownloadStemTools?: () => void;
  onCancelStemTools?: () => void;
  onDeleteStemTools?: () => void;
}

export function StemTools({
  stemToolsStatus,
  stemToolsLoading,
  downloadPercent,
  phase,
  installedVersion,
  latestVersion,
  updateAvailable,
  available,
  downloadSize,
  uncompressedSize,
  onDownloadStemTools,
  onCancelStemTools,
  onDeleteStemTools,
}: Props) {
  const sizeCaption =
    downloadSize || uncompressedSize
      ? `≈ ${formatSize(downloadSize)} download · ${formatSize(
          uncompressedSize,
        )} on disk`
      : undefined;

  if (
    stemToolsStatus === 'download' &&
    !stemToolsLoading &&
    downloadPercent === undefined &&
    available === true
  ) {
    return (
      <Tooltip
        title="Downloads a tool that pulls the drums out of any track, so you can mute them and play along yourself"
        placement="bottom"
      >
        <Button onClick={onDownloadStemTools} style={{ height: 'auto' }}>
          <div className="flex flex-col gap-0.5 items-center py-2">
            <div className="flex gap-1 items-center">
              <FontAwesomeIcon icon={faDownload} />
              Get stem splitter
            </div>
            {sizeCaption && (
              <div className="text-xs text-text-faint">{sizeCaption}</div>
            )}
          </div>
        </Button>
      </Tooltip>
    );
  }

  if (
    stemToolsStatus === 'download' &&
    !stemToolsLoading &&
    downloadPercent === undefined &&
    available === false
  ) {
    return (
      <div
        className="text-sm text-text-faint text-center"
        data-testid="stem-tools-unavailable"
      >
        Stem tools currently unavailable
      </div>
    );
  }

  if (stemToolsLoading || downloadPercent !== undefined) {
    return (
      <div className="flex flex-col gap-1" data-testid="stem-tools-progress">
        <div className="text-sm text-text-muted">
          {phase === 'extracting'
            ? 'Extracting Stem Tools...'
            : 'Downloading Stem Tools...'}
        </div>
        <div className="flex items-center gap-2">
          <Progress percent={downloadPercent ?? 0} className="grow" />

          <IconButton
            icon={faXmark}
            data-testid="cancel-stem-tools"
            onClick={onCancelStemTools}
          />
        </div>
      </div>
    );
  }

  if (
    stemToolsStatus === 'ready' &&
    !stemToolsLoading &&
    downloadPercent === undefined
  ) {
    return (
      <div className="flex flex-col gap-2" data-testid="stem-tools-installed">
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Stem splitter installed
            {installedVersion ? ` (v${installedVersion})` : ''}
          </div>

          <IconButton
            icon={faTrash}
            type="danger"
            data-testid="delete-stem-tools"
            onClick={onDeleteStemTools}
          ></IconButton>
        </div>
        {updateAvailable && (
          <div className="flex gap-2 items-center">
            <Button
              className="grow"
              data-testid="update-stem-tools"
              onClick={onDownloadStemTools}
              style={{ height: 'auto' }}
            >
              <div className="flex flex-col gap-0.5 items-center py-2">
                <div className="flex gap-1 items-center">
                  <FontAwesomeIcon icon={faDownload} />
                  Update{latestVersion ? ` to v${latestVersion}` : ''}
                </div>
                {sizeCaption && (
                  <div className="text-xs text-text-faint">{sizeCaption}</div>
                )}
              </div>
            </Button>
          </div>
        )}
      </div>
    );
  }
}
