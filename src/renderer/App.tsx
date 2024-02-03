import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

import { ConfigProvider } from 'antd';
import './App.css';
import { SelectSongView } from './views/SelectSongView/SelectSongView';
import { SongView } from './views/SongView/SongView';

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#50a5b2',
          borderRadius: 10,
          colorBgContainer: '#fbf9f1',
        },
        components: {
          Layout: {
            bodyBg: '#e5e1da',
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
