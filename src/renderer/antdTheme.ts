import type { ThemeConfig } from 'antd';
import themedark from './theme';

export const antdTheme: ThemeConfig = {
  token: {
    colorBgBase: themedark.color.bg,
    colorPrimary: themedark.color.accent,
    borderRadius: themedark.radius.sm,
    colorBorder: 'transparent',
    colorBgContainer: themedark.color.surfaceSunken,
    colorText: themedark.color.text,
    colorTextPlaceholder: themedark.color.textDimmer,
    colorError: themedark.color.red,
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
      dangerShadow: 'none',
      colorBorderDisabled: themedark.color.surfaceRaised,
      colorTextDisabled: themedark.color.textFaint,
      primaryShadow: themedark.shadow.accentButton,
      dangerColor: themedark.color.red,
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
      remainingColor: themedark.control.sliderTrack,
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
};
