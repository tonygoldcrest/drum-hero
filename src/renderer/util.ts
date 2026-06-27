import { faCircle, faPause, faXmark } from '@fortawesome/free-solid-svg-icons';
import { MappingElement } from './types';

export function formatTime(time: number) {
  const hrs = ~~(time / 3600);
  const mins = ~~((time % 3600) / 60);
  const secs = ~~time % 60;
  let ret = '';

  if (hrs > 0) {
    ret += `${hrs}:${mins < 10 ? '0' : ''}`;
  }

  ret += `${String(mins).padStart(2, '0')}:${secs < 10 ? '0' : ''}`;
  ret += `${secs}`;

  return ret;
}

export function elementIcon(type: MappingElement['type']) {
  if (type === 'cymbal') {
    return faXmark;
  }

  if (type === 'control') {
    return faPause;
  }

  return faCircle;
}
