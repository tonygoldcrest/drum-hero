import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

import { ConfigProvider } from 'antd';
import './App.css';
import { SelectSongView } from './views/SelectSongView/SelectSongView';
import { SongView } from './views/SongView/SongView';
import { theme } from './theme';

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: theme.color.primaryDark,
          borderRadius: theme.borderRadius,
          colorBgContainer: theme.color.foreground,
          colorText: theme.color.text.primary,
        },
        components: {
          Layout: {
            bodyBg: theme.color.background,
          },
          Button: {
            defaultShadow: theme.boxShadow.soft,
            primaryShadow: theme.boxShadow.soft,
          },
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<SelectSongView />}>
            <Route path=":id" element={<SongView />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
