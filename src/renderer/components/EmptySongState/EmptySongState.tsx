import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faCog,
  faFolder,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import { Mode } from '../SongFilter';

interface Props {
  mode: Mode;
  hasFolder: boolean;
  hasSongs: boolean;
}

export function EmptySongState({ mode, hasFolder, hasSongs }: Props) {
  if (mode === 'online' || hasSongs) {
    return (
      <div className="m-auto text-text-faint flex items-center gap-1 flex-col">
        <div>No songs match your filter.</div>
      </div>
    );
  }

  if (hasFolder) {
    return (
      <div className="m-auto text-text-faint flex items-center gap-1 flex-col">
        <div>No songs in this folder.</div>
        <div className="flex items-center gap-2">
          <div>Download some</div>
          <div className="border-2 border-border py-1 px-2 rounded-md">
            <FontAwesomeIcon icon={faGlobe} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="m-auto text-text-faint flex items-center gap-3 flex-col max-w-md text-center">
      <div className="flex flex-col gap-1">
        <div>Pick a folder for your songs.</div>
        <div className="text-xs text-text-dimmer italic">
          (Clone Hero players - you can point to your existing library)
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div>Open settings</div>
        <div className="border-2 border-border py-1 px-2 rounded-md">
          <FontAwesomeIcon icon={faCog} />
        </div>
        <FontAwesomeIcon icon={faArrowRight} />
        <div className="flex items-center border-2 border-border py-1 px-2 rounded-md gap-1">
          <FontAwesomeIcon icon={faFolder} />
          <div>Select folder</div>
        </div>
      </div>
    </div>
  );
}
