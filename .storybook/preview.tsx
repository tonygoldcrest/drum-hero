import type { Preview } from '@storybook/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { antdTheme } from '../src/renderer/antdTheme';
import { AppProvider } from '../src/renderer/context/AppContext';
import '../src/renderer/App.css';

const electronMock = {
  ipcRenderer: {
    sendMessage: () => {},
    on: () => () => {},
    once: () => {},
  },
};

if (
  typeof window !== 'undefined' &&
  !(window as unknown as { electron?: unknown }).electron
) {
  (window as unknown as { electron: unknown }).electron = electronMock;
}

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
  },
  decorators: [
    (Story) => (
      <ConfigProvider theme={antdTheme}>
        <AntdApp>
          <AppProvider>
            <MemoryRouter>
              <div
                className="font-ui"
                style={{
                  minHeight: '100vh',
                  background: 'var(--color-bg, #0d0d0f)',
                }}
              >
                <Story />
              </div>
            </MemoryRouter>
          </AppProvider>
        </AntdApp>
      </ConfigProvider>
    ),
  ],
};

export default preview;
