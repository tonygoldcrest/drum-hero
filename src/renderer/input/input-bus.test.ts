import { describe, expect, it, vi } from 'vitest';
import { InputBus } from './input-bus';
import { InputDevice, InputEvent, InputSource } from './types';

function makeSource(
  id: InputSource['id'],
  devices: InputDevice[],
): {
  source: InputSource;
  emit: (event: InputEvent) => void;
  stop: ReturnType<typeof vi.fn>;
  startCalls: number;
} {
  let emit: (event: InputEvent) => void = () => {};
  const stop = vi.fn();
  let startCalls = 0;
  const source: InputSource = {
    id,
    start(fn) {
      startCalls += 1;
      emit = fn;

      return stop;
    },
    listDevices() {
      return Promise.resolve(devices);
    },
  };

  return {
    source,
    emit: (event) => emit(event),
    stop,
    get startCalls() {
      return startCalls;
    },
  };
}

describe('InputBus', () => {
  it('forwards events from every source to all subscribers', () => {
    const a = makeSource('midi', []);
    const b = makeSource('keyboard', []);
    const bus = new InputBus([a.source, b.source]);
    const first: InputEvent[] = [];
    const second: InputEvent[] = [];

    bus.subscribe((event) => first.push(event));
    bus.subscribe((event) => second.push(event));
    bus.start();

    a.emit({ controlId: 'midi:38', value: 100 });
    b.emit({ controlId: 'keyboard:KeyJ', value: 127 });

    expect(first).toEqual([
      { controlId: 'midi:38', value: 100 },
      { controlId: 'keyboard:KeyJ', value: 127 },
    ]);
    expect(second).toEqual(first);
  });

  it('does not deliver events to a listener after it unsubscribes', () => {
    const a = makeSource('midi', []);
    const bus = new InputBus([a.source]);
    const received: InputEvent[] = [];
    const unsubscribe = bus.subscribe((event) => received.push(event));

    bus.start();
    a.emit({ controlId: 'midi:38', value: 1 });
    unsubscribe();
    a.emit({ controlId: 'midi:40', value: 1 });

    expect(received).toEqual([{ controlId: 'midi:38', value: 1 }]);
  });

  it('starts each source only once across repeated start calls', () => {
    const a = makeSource('midi', []);
    const bus = new InputBus([a.source]);

    bus.start();
    bus.start();

    expect(a.startCalls).toBe(1);
  });

  it('stops every source and can be restarted', () => {
    const a = makeSource('midi', []);
    const bus = new InputBus([a.source]);

    bus.start();
    bus.stop();

    expect(a.stop).toHaveBeenCalledTimes(1);

    bus.start();

    expect(a.startCalls).toBe(2);
  });

  it('routes events only to the capture listener while capturing', () => {
    const a = makeSource('midi', []);
    const bus = new InputBus([a.source]);
    const subscriber: InputEvent[] = [];
    const captured: InputEvent[] = [];

    bus.subscribe((event) => subscriber.push(event));
    bus.start();

    const release = bus.capture((event) => captured.push(event));

    a.emit({ controlId: 'midi:38', value: 1 });

    expect(captured).toEqual([{ controlId: 'midi:38', value: 1 }]);
    expect(subscriber).toEqual([]);

    release();

    a.emit({ controlId: 'midi:40', value: 1 });

    expect(subscriber).toEqual([{ controlId: 'midi:40', value: 1 }]);
  });

  it('only releases capture when the active listener releases it', () => {
    const a = makeSource('midi', []);
    const bus = new InputBus([a.source]);
    const subscriber: InputEvent[] = [];

    bus.subscribe((event) => subscriber.push(event));
    bus.start();

    const releaseFirst = bus.capture(() => {});
    const releaseSecond = bus.capture(() => {});

    releaseFirst();
    a.emit({ controlId: 'midi:38', value: 1 });

    expect(subscriber).toEqual([]);

    releaseSecond();
    a.emit({ controlId: 'midi:40', value: 1 });

    expect(subscriber).toEqual([{ controlId: 'midi:40', value: 1 }]);
  });

  it('flattens devices from all sources', async () => {
    const a = makeSource('midi', [
      { id: 'midi:Pad', name: 'Pad', sourceId: 'midi' },
    ]);
    const b = makeSource('keyboard', [
      { id: 'keyboard', name: 'Keyboard', sourceId: 'keyboard' },
    ]);
    const bus = new InputBus([a.source, b.source]);

    await expect(bus.listDevices()).resolves.toEqual([
      { id: 'midi:Pad', name: 'Pad', sourceId: 'midi' },
      { id: 'keyboard', name: 'Keyboard', sourceId: 'keyboard' },
    ]);
  });
});
