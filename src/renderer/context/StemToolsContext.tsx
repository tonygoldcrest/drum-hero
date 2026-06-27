import { createContext, useContext, ReactNode } from 'react';
import { useStemTools } from '../hooks/useStemTools';
import { StemTools } from '../components/StemTools';

type StemToolsValue = ReturnType<typeof useStemTools>;

const noop = () => {};
const defaultValue: StemToolsValue = {
  stemToolsStatus: undefined as unknown as StemToolsValue['stemToolsStatus'],
  stemToolsLoading: false,
  downloadPercent: undefined,
  phase: undefined,
  installedVersion: undefined,
  latestVersion: undefined,
  updateAvailable: false,
  available: undefined,
  downloadSize: undefined,
  uncompressedSize: undefined,
  download: noop,
  cancel: noop,
  deleteTools: noop,
};
const StemToolsContext = createContext<StemToolsValue>(defaultValue);

export function StemToolsProvider({
  value,
  children,
}: {
  value: StemToolsValue;
  children: ReactNode;
}) {
  return (
    <StemToolsContext.Provider value={value}>
      {children}
    </StemToolsContext.Provider>
  );
}

export function useStemToolsContext() {
  return useContext(StemToolsContext);
}

export function StemToolsPanel() {
  const { download, cancel, deleteTools, ...rest } = useStemToolsContext();

  return (
    <StemTools
      {...rest}
      onDownloadStemTools={download}
      onCancelStemTools={cancel}
      onDeleteStemTools={deleteTools}
    />
  );
}
