import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

import { ConfigProvider } from 'antd';
import './App.css';
import { AntdOverrides } from './antdOverrides';
import { SelectSongView } from './views/SelectSongView/SelectSongView';
import { SongView } from './views/SongView/SongView';
import themedark from './theme';

export default function App() {
  return (
    <>
      <AntdOverrides />
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: themedark.color.accent,
            borderRadius: themedark.radius.sm,
            colorBorder: 'transparent',
            colorBgContainer: themedark.color.surfaceSunken,
            colorText: themedark.color.text,
            colorTextPlaceholder: themedark.color.textDimmer,
          },
          components: {
            Input: {
              activeBorderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeShadow: 'transparent',
              fontSize: 16,
              paddingBlock: 8,
              paddingInline: 16,
            },
            Layout: {
              bodyBg: themedark.color.bg,
            },
            Button: {
              defaultShadow: 'none',
              primaryShadow: themedark.shadow.accentButton,
              colorBgContainer: themedark.color.surfaceRaised,
              colorBorder: themedark.color.border,
              colorBgContainerDisabled: themedark.control.iconButtonBg,
              colorPrimaryBgHover: themedark.control.iconButtonActiveBg,
              colorPrimaryBorder: themedark.control.iconButtonActiveBorder,
            },
            Slider: {
              trackBg: themedark.color.accent,
              trackHoverBg: themedark.color.accentHover,
              railBg: themedark.control.sliderTrack,
              railHoverBg: themedark.control.sliderTrack,
              handleColor: themedark.control.sliderThumb,
              handleActiveColor: themedark.control.sliderThumb,
              colorBgElevated: themedark.control.sliderThumb,
            },
            Switch: {
              colorPrimary: themedark.control.toggleOn,
              colorPrimaryHover: themedark.control.toggleOn,
              colorTextQuaternary: themedark.control.toggleOffTrack,
              colorTextTertiary: themedark.control.toggleOffTrack,
              handleBg: themedark.control.toggleKnobOn,
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
    </>
  );
}
