import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { uniq } from 'es-toolkit';
import { InputElement, InputMapping } from '../../types';
import { inputBus, InputDevice } from '../input';
import { PlayheadStyle, PLAYHEAD_STYLES } from '../types';

interface AppContextValue {
  playheadStyle: PlayheadStyle;
  setPlayheadStyle: (s: PlayheadStyle) => void;
  enableColors: boolean;
  setEnableColors: (v: boolean) => void;
  showBarNumbers: boolean;
  setShowBarNumbers: (v: boolean) => void;
  showTempo: boolean;
  setShowTempo: (v: boolean) => void;
  countIn: boolean;
  setCountIn: (v: boolean) => void;
  currentPath: string | null;
  setCurrentPath: (p: string | null) => void;
  selectedDevice: InputDevice | null;
  setSelectedDevice: (d: InputDevice | null) => void;
  inputMapping: InputMapping;
  assignControl: (element: InputElement, controlId: string) => void;
  removeControl: (element: InputElement, controlId: string) => void;
  mixerLevels: Record<string, number>;
  setMixerLevels: (mixerLevels: Record<string, number>) => void;
}

const EMPTY_INPUT_MAPPING: InputMapping = {
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
const KIT_ELEMENTS = Object.keys(EMPTY_INPUT_MAPPING) as InputElement[];

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
  const [showTempo, setShowTempo] = usePersisted('settings.showTempo', true);
  const [countIn, setCountIn] = usePersisted('settings.countIn', true);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = usePersisted<InputDevice | null>(
    'settings.selectedDevice',
    null,
  );
  const [mixerLevels, setMixerLevels] = usePersisted<Record<string, number>>(
    'settings.mixerLevels',
    {},
  );
  const [inputMappings, setInputMappings] = usePersisted<
    Record<string, InputMapping>
  >('settings.inputMappings', {});
  const inputMapping: InputMapping = {
    ...EMPTY_INPUT_MAPPING,
    ...(selectedDevice ? inputMappings[selectedDevice.id] : undefined),
  };
  const updateMapping = useCallback(
    (update: (current: InputMapping) => InputMapping) => {
      if (!selectedDevice) {
        return;
      }

      setInputMappings((prev) => ({
        ...prev,
        [selectedDevice.id]: update({
          ...EMPTY_INPUT_MAPPING,
          ...prev[selectedDevice.id],
        }),
      }));
    },
    [selectedDevice, setInputMappings],
  );
  const assignControl = useCallback(
    (element: InputElement, controlId: string) => {
      updateMapping(
        (current) =>
          Object.fromEntries(
            KIT_ELEMENTS.map((key) => [
              key,
              key === element
                ? uniq([...(current[key] ?? []), controlId])
                : (current[key] ?? []).filter((c) => c !== controlId),
            ]),
          ) as InputMapping,
      );
    },
    [updateMapping],
  );
  const removeControl = useCallback(
    (element: InputElement, controlId: string) => {
      updateMapping((current) => ({
        ...current,
        [element]: (current[element] ?? []).filter((c) => c !== controlId),
      }));
    },
    [updateMapping],
  );

  useEffect(() => {
    inputBus.start();
  }, []);

  useEffect(() => {
    inputBus.listDevices().then((list) => {
      setSelectedDevice((prev: InputDevice | null) =>
        prev && list.some((d) => d.id === prev.id) ? prev : null,
      );
    });
  }, [setSelectedDevice]);

  useEffect(() => {
    if (selectedDevice?.sourceId !== 'midi') {
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
        showTempo,
        setShowTempo,
        countIn,
        setCountIn,
        currentPath,
        setCurrentPath,
        selectedDevice,
        setSelectedDevice,
        inputMapping,
        assignControl,
        removeControl,
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
