import { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { InputElement } from '../../types';
import { KIT_ELEMENTS } from '../constants';
import { elementIcon } from '../util';
import { cn } from '../cn';

const PLACEMENT_CLASS = '-top-1 -right-1';
const ROUND_PLACEMENT_CLASS =
  'top-[15%] left-[85%] -translate-x-1/2 -translate-y-1/2';

interface Props {
  element?: InputElement;
  round?: boolean;
  className?: string;
  children: ReactNode;
}

export function MappingHint({ element, round, className, children }: Props) {
  const mapping = element ? KIT_ELEMENTS.get(element) : undefined;

  return (
    <div className={cn('relative inline-flex', className)}>
      {children}
      {mapping && (
        <div
          className={cn(
            'absolute z-10 flex items-center justify-center',
            round ? ROUND_PLACEMENT_CLASS : PLACEMENT_CLASS,
          )}
        >
          <FontAwesomeIcon
            icon={elementIcon(mapping.type)}
            style={{
              color: mapping.color,
              animation: 'sk-mapping-hint-pulse 1.6s ease-in-out infinite',
              ...(mapping.type === 'cymbal' && {
                stroke: mapping.color,
                strokeWidth: 32,
                strokeLinejoin: 'round',
                strokeLinecap: 'round',
              }),
            }}
          />
        </div>
      )}
    </div>
  );
}
