import { useState, type CSSProperties } from 'react';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { useStemToolsContext } from '../../context/StemToolsContext';
import { Popover } from '../Popover';
import { IconButton } from '../IconButton';
import { SongMenuContent } from './SongMenuContent';

interface Props {
  id: string;
  dir: string;
  canSplit: boolean;
  splitting: boolean;
  onSplit: () => void;
}

export function SongMenu({ id, dir, canSplit, splitting, onSplit }: Props) {
  const { stemToolsStatus } = useStemToolsContext();
  const [isOpen, setIsOpen] = useState(false);
  const showSplit = stemToolsStatus === 'ready' && canSplit;
  const close = () => setIsOpen(false);

  return (
    <Popover
      anchorName={`--song-menu-${id}`}
      open={isOpen}
      onOpenChange={setIsOpen}
      offset={4}
      closeOnRouteChange={false}
      renderTrigger={({ ref, toggle, anchorStyle }) => (
        <IconButton
          ref={ref}
          data-testid="song-menu-trigger"
          className="mt-auto"
          style={anchorStyle as CSSProperties}
          icon={faEllipsisVertical}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggle();
          }}
        />
      )}
    >
      <SongMenuContent
        showSplit={showSplit}
        splitting={splitting}
        onOpenDirectory={() => {
          window.electron.ipcRenderer.sendMessage('open-song-directory', dir);
          close();
        }}
        onSplit={() => {
          onSplit();
          close();
        }}
      />
    </Popover>
  );
}
