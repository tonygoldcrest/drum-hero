export type SourceId = 'midi' | 'keyboard';

export interface InputDevice {
  id: string;
  name: string;
  sourceId: SourceId;
  port?: number;
}

export interface InputEvent {
  controlId: string;
  value: number;
}

export interface InputSource {
  readonly id: SourceId;
  start(emit: (event: InputEvent) => void): () => void;
  listDevices(): Promise<InputDevice[]>;
}
