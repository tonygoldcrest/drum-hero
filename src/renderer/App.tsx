import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { App as AntdApp, ConfigProvider } from 'antd';
import './App.css';
import { SongListView } from './views/SongListView';
import { SongView } from './views/SongView';
import { antdTheme } from './antdTheme';
import { AppProvider } from './context/AppContext';
import { useAppUpdate } from './hooks/useAppUpdate';

function UpdateNotifier() {
  useAppUpdate();

  return undefined;
}

export default function App() {
  return (
    <>
      <ConfigProvider theme={antdTheme}>
        <AntdApp>
          <UpdateNotifier />
          <AppProvider>
            <Router>
              <Routes>
                <Route path="/" element={<SongListView />}>
                  <Route path=":id" element={<SongView />} />
                </Route>
              </Routes>
            </Router>
          </AppProvider>
        </AntdApp>
      </ConfigProvider>
    </>
  );
}
