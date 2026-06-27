import { InputDevice, InputEvent, InputSource } from './types';

export class InputBus {
  private listeners = new Set<(event: InputEvent) => void>();
  private stops: (() => void)[] = [];
  private captureListener?: (event: InputEvent) => void;

  constructor(private sources: InputSource[]) {}

  start(): void {
    if (this.stops.length > 0) {
      return;
    }

    const emit = (event: InputEvent) => {
      if (this.captureListener) {
        this.captureListener(event);

        return;
      }

      this.listeners.forEach((listener) => listener(event));
    };

    this.stops = this.sources.map((source) => source.start(emit));
  }

  stop(): void {
    this.stops.forEach((stop) => stop());
    this.stops = [];
  }

  subscribe = (listener: (event: InputEvent) => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  capture = (listener: (event: InputEvent) => void): (() => void) => {
    this.captureListener = listener;

    return () => {
      if (this.captureListener === listener) {
        this.captureListener = undefined;
      }
    };
  };

  async listDevices(): Promise<InputDevice[]> {
    const lists = await Promise.all(
      this.sources.map((source) => source.listDevices()),
    );

    return lists.flat();
  }
}
