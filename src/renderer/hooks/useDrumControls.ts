import { useEffect, useRef } from 'react';
import {
  MidiDevice,
  MidiMapping,
  MidiMessage,
  MidiMessageType,
} from '../../types';

export type DrumControlHandlers = Partial<
  Record<keyof MidiMapping, () => void>
>;

export function useDrumControls(
  selectedDevice: MidiDevice | null,
  midiMapping: MidiMapping,
  handlers: DrumControlHandlers,
  enabled = true,
): void {
  const mappingRef = useRef(midiMapping);
  const handlersRef = useRef(handlers);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    mappingRef.current = midiMapping;
  }, [midiMapping]);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!selectedDevice) {
      return undefined;
    }

    return window.electron.ipcRenderer.on<MidiMessage>(
      'listen-midi',
      ({ type, note, velocity }) => {
        if (!enabledRef.current) {
          return;
        }

        if (type !== MidiMessageType.NoteOn || velocity === 0) {
          return;
        }

        const mapping = mappingRef.current;
        const element = (Object.keys(mapping) as (keyof MidiMapping)[]).find(
          (key) => mapping[key]?.includes(note),
        );

        if (element) {
          handlersRef.current[element]?.();
        }
      },
    );
  }, [selectedDevice]);
}
