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

export function makeControlId(
  sourceId: SourceId,
  raw: string | number,
): string {
  return `${sourceId}:${raw}`;
}

export function controlSource(controlId: string): string {
  const index = controlId.indexOf(':');

  return index === -1 ? controlId : controlId.slice(0, index);
}

export function controlLabel(controlId: string): string {
  const index = controlId.indexOf(':');

  return index === -1 ? controlId : controlId.slice(index + 1);
}
