import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { PlayheadStyle, PLAYHEAD_STYLES } from '../types';

interface SettingsContextValue {
  playheadStyle: PlayheadStyle;
  setPlayheadStyle: (s: PlayheadStyle) => void;
  enableColors: boolean;
  setEnableColors: (v: boolean) => void;
  showBarNumbers: boolean;
  setShowBarNumbers: (v: boolean) => void;
  progressColoring: boolean;
  setProgressColoring: (v: boolean) => void;
  currentPath: string | null;
  setCurrentPath: (p: string | null) => void;
}

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

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
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
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  return (
    <SettingsContext.Provider
      value={{
        playheadStyle,
        setPlayheadStyle,
        enableColors,
        setEnableColors,
        showBarNumbers,
        setShowBarNumbers,
        progressColoring,
        setProgressColoring,
        currentPath,
        setCurrentPath,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);

  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }

  return ctx;
}
