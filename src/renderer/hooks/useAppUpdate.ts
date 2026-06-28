import { useEffect, createElement } from 'react';
import { App, Button } from 'antd';
import { IpcUpdateAvailableResponse } from '../../types';

export function useAppUpdate() {
  const { notification } = App.useApp();

  useEffect(() => {
    const off = window.electron.ipcRenderer.on<IpcUpdateAvailableResponse>(
      'update-available',
      ({ version, releaseUrl }) => {
        notification.info({
          key: 'app-update',
          message: 'Update available',
          description: `Version ${version} is available to download.`,
          placement: 'bottomRight',
          duration: 0,
          btn: createElement(
            Button,
            {
              type: 'primary',
              size: 'small',
              onClick: () => {
                window.open(releaseUrl);
                notification.destroy('app-update');
              },
            },
            'Download',
          ),
        });
      },
    );

    window.electron.ipcRenderer.sendMessage('check-update');

    return off;
  }, [notification]);
}
