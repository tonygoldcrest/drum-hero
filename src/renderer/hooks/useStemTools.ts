import { useEffect, useState } from 'react';
import { App } from 'antd';
import { IpcDownloadStemToolsResponse, StemToolsStatus } from '../../types';

export function useStemTools() {
  const { notification } = App.useApp();
  const [stemToolsStatus, setStemToolsStatus] =
    useState<StemToolsStatus>('ready');
  const [stemToolsLoading, setStemToolsLoading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState<number | undefined>();

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('check-stem-tools');
    window.electron.ipcRenderer.once<StemToolsStatus>(
      'check-stem-tools',
      (status) => {
        setStemToolsStatus(status);
      },
    );

    return window.electron.ipcRenderer.on<IpcDownloadStemToolsResponse>(
      'download-stem-tools',
      (status) => {
        if (status.progress !== undefined) {
          setDownloadPercent(status.progress);

          return;
        }

        setDownloadPercent(undefined);
        setStemToolsLoading(false);

        if (status.error) {
          notification.error({
            title: 'Error downloading stem tools',
            description: status.error,
            placement: 'bottomRight',
          });
        } else if (status.success) {
          setStemToolsStatus('ready');
        }
      },
    );
  }, [notification]);

  function download() {
    window.electron.ipcRenderer.sendMessage('download-stem-tools');
    setStemToolsLoading(true);
  }

  return { stemToolsStatus, stemToolsLoading, downloadPercent, download };
}
