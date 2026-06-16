export const theme = {
  boxShadow: {
    soft: 'rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 1px 3px 1px',
  },
  color: {
    dark: '#2D3436',
    primaryDark: '#50a5b2',
    primary: '#92C7CF',
    primaryLight: '#AAD7D9',
    primaryLightest: '#c9e5e7',
    foreground: '#FBF9F1',
    background: '#E5E1DA',
    text: {
      primary: '#333',
      secondary: '#444',
      tertiary: '#888',
    },
  },
  borderRadius: 5,
};

export const themedark = {
  color: {
    bg: '#141517',
    surface: '#1c1d20',
    surfaceRaised: '#232428',
    surfaceSunken: '#0e0f11',
    headerGradient: 'linear-gradient(180deg, #232428, #191a1d)',

    border: 'rgba(255,255,255,0.07)',
    borderSoft: 'rgba(255,255,255,0.04)',
    divider: 'rgba(255,255,255,0.05)',
    fill: 'rgba(255,255,255,0.04)',
    fillStrong: 'rgba(255,255,255,0.10)',

    text: '#f2ede1',
    textBody: '#e6e0d3',
    textMuted: '#9c9484',
    textFaint: '#8a8474',
    textDim: '#615c50',
    textDimmer: '#5f5a4e',

    accent: '#ff5a3c',
    accentHover: '#ff6a4d',
    accentDeep: '#ec4527',
    accentText: '#ff7a5f',
    accentInk: '#1a160f',
    accentGradient: 'linear-gradient(145deg, #ff6a4d, #ec4527)',
    accentSoftBg: 'rgba(255,90,60,0.08)',
    accentSoftBorder: 'rgba(255,90,60,0.22)',

    paper: '#ece3d0',
    ink: '#1c1a14',
    inkSoft: '#4a463c',
  },

  font: {
    display: "'Newsreader', Georgia, serif",
    ui: "'Space Grotesk', system-ui, sans-serif", // labels, body, numbers
    weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },

  fontSize: {
    sheetTitle: 32,
    sectionTitle: 24,
    songTitle: 19,
    panelTitle: 21,
    transportTitle: 17,
    body: 15,
    label: 14,
    small: 13.5,
    caption: 12.5,
    overline: 12,
    micro: 11,
  },

  radius: {
    xs: 2,
    sm: 8,
    md: 11,
    lg: 14,
    xl: 18,
    panel: 22,
    pill: 999,
  },

  shadow: {
    frame:
      '0 40px 90px -30px rgba(40,30,10,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
    panel:
      '0 40px 90px -30px rgba(40,30,10,0.55), 0 0 0 1px rgba(255,255,255,0.05)',
    accentButton:
      '0 12px 32px -6px rgba(255,90,60,0.6), inset 0 1px 0 rgba(255,255,255,0.3)',
    accentChip: '0 6px 16px -4px rgba(255,90,60,0.5)',
    accentSoft: '0 6px 6px -6px rgba(255,90,60,0.5)',
    paper:
      'inset 0 1px 0 rgba(255,255,255,0.6), 0 18px 40px -20px rgba(0,0,0,0.6)',
    floatLabel: '0 8px 20px rgba(0,0,0,0.4)',
  },

  space: { xs: 4, sm: 8, md: 14, lg: 22, xl: 26, xxl: 40 },

  control: {
    toggleOn: '#ff5a3c',
    toggleOffTrack: 'rgba(255,255,255,0.10)',
    toggleKnobOn: '#ffffff',
    toggleKnobOff: '#7a7466',
    sliderTrack: 'rgba(255,255,255,0.08)',
    sliderFill: 'linear-gradient(90deg, #ec4527, #ff5a3c)',
    sliderFillMuted: 'rgba(255,255,255,0.18)',
    sliderThumb: '#ffffff',
    iconButtonBg: 'rgba(255,255,255,0.05)',
    iconButtonActiveBg: 'rgba(255,90,60,0.14)',
    iconButtonActiveBorder: 'rgba(255,90,60,0.28)',
  },
};

export default themedark;
