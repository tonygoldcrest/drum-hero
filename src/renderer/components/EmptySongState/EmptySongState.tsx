import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faCog,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';
import { Mode } from '../SongFilter';

interface Props {
  mode: Mode;
}

export function EmptySongState({ mode }: Props) {
  return (
    <div className="m-auto text-text-faint flex items-center gap-1 flex-col">
      <div>No songs found.</div>
      {mode !== 'online' && (
        <div className="flex items-center gap-2">
          <div>Select a different folder</div>
          <div className="border-2 border-border py-1 px-2 rounded-md">
            <FontAwesomeIcon icon={faCog} />
          </div>
          <FontAwesomeIcon icon={faArrowRight} />
          <div className="flex items-center border-2 border-border py-1 px-2 rounded-md gap-1">
            <FontAwesomeIcon icon={faFolder} />
            <div>Select folder</div>
          </div>
        </div>
      )}
    </div>
  );
}
