import { Divider } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { cn } from '../../cn';
import { KIT_ELEMENTS } from '../../constants';
import { elementIcon } from '../../util';

interface ReferenceProps {
  className?: string;
}

export function Reference({ className }: ReferenceProps) {
  return (
    <div
      className={cn(
        'bg-paper-light px-2 py-1 rounded-xl border border-ink/13 text-ink shadow-paper-strong flex items-center',
        className,
      )}
    >
      {KIT_ELEMENTS.map((element, index) => {
        return (
          <div key={element.value} className="flex items-center">
            {index > 0 && <Divider vertical className="bg-ink/13" />}
            <div className="px-2 py-0.2 flex items-center gap-2 text-nowrap">
              <FontAwesomeIcon
                icon={elementIcon(element.type)}
                color={element.color}
                size="lg"
              />
              <div className="font-ui font-semibold">{element.displayName}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
