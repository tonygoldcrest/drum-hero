import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { App as AntdApp, ConfigProvider } from 'antd';
import './App.css';
import { SongListView } from './views/SongListView';
import { SongView } from './views/SongView';
import themedark from './theme';
import { SettingsProvider } from './context/SettingsContext';

export default function App() {
  return (
    <>
      <ConfigProvider
        theme={{
          token: {
            colorBgBase: themedark.color.bg,
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
              colorBorderDisabled: themedark.color.surfaceRaised,
              colorTextDisabled: themedark.color.textFaint,
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
            Divider: {
              colorSplit: themedark.color.divider,
              marginLG: 0,
            },
            Tooltip: {
              colorBgSpotlight: themedark.color.surfaceSunken,
              colorTextLightSolid: themedark.color.textMuted,
            },
            Progress: {
              colorText: themedark.color.textMuted,
              defaultColor: themedark.control.sliderFill,
              colorSuccess: themedark.color.accent,
            },
            Notification: {
              colorError: themedark.color.accent,
              colorIcon: themedark.color.textMuted,
              colorIconHover: themedark.color.text,
              colorText: themedark.color.textFaint,
              colorTextHeading: themedark.color.text,
              colorInfo: themedark.color.blue,
              colorSuccess: themedark.color.green,
            },
          },
        }}
      >
        <AntdApp>
          <SettingsProvider>
            <Router>
              <Routes>
                <Route path="/" element={<SongListView />}>
                  <Route path=":id" element={<SongView />} />
                </Route>
              </Routes>
            </Router>
          </SettingsProvider>
        </AntdApp>
      </ConfigProvider>
    </>
  );
}
