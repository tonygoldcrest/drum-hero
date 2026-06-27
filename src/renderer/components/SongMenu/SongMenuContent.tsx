import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faHandScissors } from '@fortawesome/free-solid-svg-icons';

interface Props {
  showSplit: boolean;
  splitting: boolean;
  onOpenDirectory: () => void;
  onSplit: () => void;
}

export function SongMenuContent({
  showSplit,
  splitting,
  onOpenDirectory,
  onSplit,
}: Props) {
  return (
    <>
      <button
        className="flex items-center gap-3 px-4 py-2.5 text-text-muted hover:text-text cursor-pointer bg-transparent border-0 whitespace-nowrap w-full text-left"
        onClick={onOpenDirectory}
      >
        <FontAwesomeIcon icon={faFolder} className="w-4" />
        Open song directory
      </button>

      {showSplit && (
        <button
          className="flex items-center gap-3 px-4 py-2.5 text-text-muted hover:text-text cursor-pointer bg-transparent border-0 whitespace-nowrap w-full text-left disabled:opacity-40 disabled:cursor-default"
          disabled={splitting}
          onClick={onSplit}
        >
          <FontAwesomeIcon icon={faHandScissors} className="w-4" />
          {splitting ? 'Splitting…' : 'Split stems'}
        </button>
      )}
    </>
  );
}
