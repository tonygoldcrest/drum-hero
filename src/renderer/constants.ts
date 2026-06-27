import themedark from './theme';
import { MappingElement } from './types';

export const KIT_ELEMENTS: MappingElement[] = [
  {
    value: 'hihat',
    displayName: 'Hi-Hat',
    color: themedark.color.yellow,
    type: 'cymbal',
  },
  {
    value: 'ride',
    displayName: 'Ride',
    alternative: 'Library',
    color: themedark.color.blue,
    type: 'cymbal',
  },
  {
    value: 'crash',
    displayName: 'Crash',
    alternative: 'Difficulty',
    color: themedark.color.green,
    type: 'cymbal',
  },
  {
    value: 'snare',
    displayName: 'Snare',
    alternative: 'Back',
    color: themedark.color.red,
    type: 'drum',
  },
  {
    value: 'tom1',
    displayName: 'Tom 1',
    alternative: 'Up',
    color: themedark.color.yellow,
    type: 'drum',
  },
  {
    value: 'tom2',
    displayName: 'Tom 2',
    alternative: 'Down',
    color: themedark.color.blue,
    type: 'drum',
  },
  {
    value: 'tom3',
    displayName: 'Tom 3',
    alternative: 'Confirm',
    color: themedark.color.green,
    type: 'drum',
  },
  {
    value: 'kick',
    displayName: 'Kick',
    alternative: 'Sort',
    color: themedark.color.orange,
    type: 'drum',
  },
];
