import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import themedark from '../../theme';
import { Tooltip } from '../Tooltip';

interface Props {
  label: string;
  tooltip: string;
}

export function SettingLabel({ label, tooltip }: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-text-muted whitespace-nowrap">{label}</div>

      <Tooltip title={tooltip} placement="right">
        <FontAwesomeIcon icon={faInfoCircle} color={themedark.color.textDim} />
      </Tooltip>
    </div>
  );
}
