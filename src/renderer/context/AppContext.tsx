import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { uniq } from 'es-toolkit';
import { MidiMapping, MidiDevice } from '../../types';
import { PlayheadStyle, PLAYHEAD_STYLES } from '../types';

interface AppContextValue {
  playheadStyle: PlayheadStyle;
  setPlayheadStyle: (s: PlayheadStyle) => void;
  enableColors: boolean;
  setEnableColors: (v: boolean) => void;
  showBarNumbers: boolean;
  setShowBarNumbers: (v: boolean) => void;
  progressColoring: boolean;
  setProgressColoring: (v: boolean) => void;
  countIn: boolean;
  setCountIn: (v: boolean) => void;
  currentPath: string | null;
  setCurrentPath: (p: string | null) => void;
  selectedDevice: MidiDevice | null;
  setSelectedDevice: (d: MidiDevice | null) => void;
  midiMapping: MidiMapping;
  assignNote: (element: keyof MidiMapping, note: number) => void;
  removeNote: (element: keyof MidiMapping, note: number) => void;
  mixerLevels: Record<string, number>;
  setMixerLevels: (mixerLevels: Record<string, number>) => void;
}

const EMPTY_MIDI_MAPPING: MidiMapping = {
  hihat: [],
  ride: [],
  crash: [],
  kick: [],
  snare: [],
  tom1: [],
  tom2: [],
  tom3: [],
  pause: [],
};
const KIT_ELEMENTS = Object.keys(EMPTY_MIDI_MAPPING) as (keyof MidiMapping)[];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);

    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function usePersisted<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => load(key, fallback));

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [playheadStyle, setPlayheadStyle] = usePersisted<PlayheadStyle>(
    'settings.playheadStyle',
    PLAYHEAD_STYLES[0],
  );
  const [enableColors, setEnableColors] = usePersisted(
    'settings.enableColors',
    true,
  );
  const [showBarNumbers, setShowBarNumbers] = usePersisted(
    'settings.showBarNumbers',
    false,
  );
  const [progressColoring, setProgressColoring] = usePersisted(
    'settings.progressColoring',
    true,
  );
  const [countIn, setCountIn] = usePersisted('settings.countIn', true);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = usePersisted<MidiDevice | null>(
    'settings.selectedDevice',
    null,
  );
  const [mixerLevels, setMixerLevels] = usePersisted<Record<string, number>>(
    'settings.mixerLevels',
    {},
  );
  const [midiMappings, setMidiMappings] = usePersisted<
    Record<string, MidiMapping>
  >('settings.midiMappings', {});
  const midiMapping: MidiMapping = {
    ...EMPTY_MIDI_MAPPING,
    ...(selectedDevice ? midiMappings[selectedDevice.name] : undefined),
  };
  const updateMapping = useCallback(
    (update: (current: MidiMapping) => MidiMapping) => {
      if (!selectedDevice) {
        return;
      }

      setMidiMappings((prev) => ({
        ...prev,
        [selectedDevice.name]: update({
          ...EMPTY_MIDI_MAPPING,
          ...prev[selectedDevice.name],
        }),
      }));
    },
    [selectedDevice, setMidiMappings],
  );
  const assignNote = useCallback(
    (element: keyof MidiMapping, note: number) => {
      updateMapping(
        (current) =>
          Object.fromEntries(
            KIT_ELEMENTS.map((key) => [
              key,
              key === element
                ? uniq([...(current[key] ?? []), note])
                : (current[key] ?? []).filter((n) => n !== note),
            ]),
          ) as MidiMapping,
      );
    },
    [updateMapping],
  );
  const removeNote = useCallback(
    (element: keyof MidiMapping, note: number) => {
      updateMapping((current) => ({
        ...current,
        [element]: (current[element] ?? []).filter((n) => n !== note),
      }));
    },
    [updateMapping],
  );

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('midi-device-list');

    window.electron.ipcRenderer.once<MidiDevice[]>(
      'midi-device-list',
      (list) => {
        setSelectedDevice((prev: MidiDevice | null) =>
          prev && list.some((d) => d.name === prev.name) ? prev : null,
        );
      },
    );
  }, [setSelectedDevice]);

  useEffect(() => {
    if (!selectedDevice) {
      return undefined;
    }

    window.electron.ipcRenderer.sendMessage('listen-midi', selectedDevice.port);

    return () => {
      window.electron.ipcRenderer.sendMessage('stop-listen-midi');
    };
  }, [selectedDevice]);

  return (
    <AppContext.Provider
      value={{
        playheadStyle,
        setPlayheadStyle,
        enableColors,
        setEnableColors,
        showBarNumbers,
        setShowBarNumbers,
        progressColoring,
        setProgressColoring,
        countIn,
        setCountIn,
        currentPath,
        setCurrentPath,
        selectedDevice,
        setSelectedDevice,
        midiMapping,
        assignNote,
        removeNote,
        mixerLevels,
        setMixerLevels,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);

  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }

  return ctx;
}
