import { Tooltip as AntTooltip } from 'antd';
import type { TooltipProps } from 'antd';

export function Tooltip(props: TooltipProps) {
  return <AntTooltip {...props} styles={{ root: { pointerEvents: 'none' } }} />;
}
