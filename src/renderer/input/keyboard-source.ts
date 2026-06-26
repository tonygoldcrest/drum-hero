import { InputDevice, InputEvent, InputSource, makeControlId } from './types';

const KEYBOARD_DEVICE: InputDevice = {
  id: 'keyboard',
  name: 'Keyboard',
  sourceId: 'keyboard',
};

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;

  return (
    !!el &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable)
  );
}

export class KeyboardSource implements InputSource {
  readonly id = 'keyboard' as const;

  start(emit: (event: InputEvent) => void): () => void {
    const handle = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTyping(event.target)
      ) {
        return;
      }

      emit({ controlId: makeControlId('keyboard', event.code), value: 127 });
    };

    window.addEventListener('keydown', handle);

    return () => window.removeEventListener('keydown', handle);
  }

  listDevices(): Promise<InputDevice[]> {
    return Promise.resolve([KEYBOARD_DEVICE]);
  }
}
