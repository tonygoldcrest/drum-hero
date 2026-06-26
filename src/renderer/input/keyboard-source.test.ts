import { afterEach, describe, expect, it } from 'vitest';
import { KeyboardSource } from './keyboard-source';
import { InputEvent } from './types';

function listen(): { events: InputEvent[]; stop: () => void } {
  const events: InputEvent[] = [];
  const stop = new KeyboardSource().start((event) => events.push(event));

  return { events, stop };
}

function press(init: KeyboardEventInit, target?: EventTarget): void {
  const event = new KeyboardEvent('keydown', init);

  if (target) {
    Object.defineProperty(event, 'target', { value: target });
    target.dispatchEvent(event);
  } else {
    window.dispatchEvent(event);
  }
}

describe('KeyboardSource', () => {
  let active: (() => void) | undefined;

  afterEach(() => {
    active?.();
    active = undefined;
  });

  it('emits a max-velocity event for a plain key press', () => {
    const { events, stop } = listen();

    active = stop;
    press({ code: 'KeyJ' });

    expect(events).toEqual([{ controlId: 'keyboard:KeyJ', value: 127 }]);
  });

  it('ignores auto-repeat and modifier-held presses', () => {
    const { events, stop } = listen();

    active = stop;
    press({ code: 'KeyJ', repeat: true });
    press({ code: 'KeyJ', metaKey: true });
    press({ code: 'KeyJ', ctrlKey: true });
    press({ code: 'KeyJ', altKey: true });

    expect(events).toEqual([]);
  });

  it('ignores presses while typing in an input or editable element', () => {
    const { events, stop } = listen();

    active = stop;

    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const editable = document.createElement('div');

    editable.contentEditable = 'true';
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    document.body.append(input, textarea, editable);

    [input, textarea, editable].forEach((el) =>
      el.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyJ', bubbles: true }),
      ),
    );

    expect(events).toEqual([]);

    input.remove();
    textarea.remove();
    editable.remove();
  });

  it('stops emitting once the returned cleanup runs', () => {
    const { events, stop } = listen();

    stop();
    press({ code: 'KeyJ' });

    expect(events).toEqual([]);
  });

  it('lists a single keyboard device', async () => {
    await expect(new KeyboardSource().listDevices()).resolves.toEqual([
      { id: 'keyboard', name: 'Keyboard', sourceId: 'keyboard' },
    ]);
  });
});
