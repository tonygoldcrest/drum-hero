import { describe, expect, it } from 'vitest';
import themedark, {
  alpha,
  channels,
  darken,
  lighten,
  mixToward,
  toHex,
} from './theme';

describe('channels', () => {
  it('parses a hex string into red, green, blue bytes', () => {
    expect(channels('#d54b30')).toEqual([0xd5, 0x4b, 0x30]);
  });

  it('parses a hex string without the leading hash', () => {
    expect(channels('ffffff')).toEqual([255, 255, 255]);
  });

  it('parses black', () => {
    expect(channels('#000000')).toEqual([0, 0, 0]);
  });
});

describe('toHex', () => {
  it('formats channels back into a hex string', () => {
    expect(toHex(0xd5, 0x4b, 0x30)).toBe('#d54b30');
  });

  it('zero-pads single-digit channels', () => {
    expect(toHex(1, 2, 3)).toBe('#010203');
  });

  it('rounds fractional channels to the nearest integer', () => {
    expect(toHex(0.4, 1.5, 2.6)).toBe('#000203');
  });

  it('clamps channels above 255 and below 0', () => {
    expect(toHex(300, -10, 128)).toBe('#ff0080');
  });

  it('round-trips with channels', () => {
    const [r, g, b] = channels('#3b6fd4');

    expect(toHex(r, g, b)).toBe('#3b6fd4');
  });
});

describe('mixToward', () => {
  it('returns the original color when the amount is zero', () => {
    expect(mixToward('#d54b30', 255, 0)).toBe('#d54b30');
  });

  it('returns the target on every channel when the amount is one', () => {
    expect(mixToward('#d54b30', 255, 1)).toBe('#ffffff');
    expect(mixToward('#d54b30', 0, 1)).toBe('#000000');
  });

  it('interpolates each channel linearly toward the target', () => {
    expect(mixToward('#000000', 255, 0.5)).toBe('#808080');
  });
});

describe('lighten', () => {
  it('mixes the color toward white', () => {
    expect(lighten('#d54b30', 0.14)).toBe(mixToward('#d54b30', 255, 0.14));
  });

  it('produces a brighter color than the input', () => {
    const [r, g, b] = channels(lighten('#d54b30', 0.2));
    const [r0, g0, b0] = channels('#d54b30');

    expect(r).toBeGreaterThan(r0);
    expect(g).toBeGreaterThan(g0);
    expect(b).toBeGreaterThan(b0);
  });
});

describe('darken', () => {
  it('mixes the color toward black', () => {
    expect(darken('#d54b30', 0.16)).toBe(mixToward('#d54b30', 0, 0.16));
  });

  it('produces a darker color than the input', () => {
    const [r, g, b] = channels(darken('#d54b30', 0.2));
    const [r0, g0, b0] = channels('#d54b30');

    expect(r).toBeLessThan(r0);
    expect(g).toBeLessThan(g0);
    expect(b).toBeLessThan(b0);
  });
});

describe('alpha', () => {
  it('builds an rgba string from a hex color and an opacity', () => {
    expect(alpha('#d54b30', 0.6)).toBe('rgba(213, 75, 48, 0.6)');
  });

  it('keeps the channels intact at full opacity', () => {
    expect(alpha('#3b6fd4', 1)).toBe('rgba(59, 111, 212, 1)');
  });
});

describe('themedark accent derivation', () => {
  const accent = themedark.color.accent;

  it('keeps the accent base as the configured value', () => {
    expect(accent).toBe('#d54b30');
  });

  it('derives the hover, deep and text shades from the accent base', () => {
    expect(themedark.color.accentHover).toBe(lighten(accent, 0.14));
    expect(themedark.color.accentDeep).toBe(darken(accent, 0.16));
    expect(themedark.color.accentText).toBe(lighten(accent, 0.15));
  });

  it('derives soft fills and borders as alpha tints of the accent', () => {
    expect(themedark.color.accentSoftBg).toBe(alpha(accent, 0.08));
    expect(themedark.color.accentSoftBorder).toBe(alpha(accent, 0.22));
  });

  it('derives the gradient from the hover and deep shades', () => {
    expect(themedark.color.accentGradient).toBe(
      `linear-gradient(145deg, ${themedark.color.accentHover}, ${themedark.color.accentDeep})`,
    );
  });

  it('drives the control tokens from the same accent base', () => {
    expect(themedark.control.toggleOn).toBe(accent);
    expect(themedark.control.sliderFill).toBe(
      `linear-gradient(90deg, ${themedark.color.accentDeep}, ${accent})`,
    );
    expect(themedark.control.iconButtonActiveBg).toBe(alpha(accent, 0.14));
    expect(themedark.control.iconButtonActiveBorder).toBe(alpha(accent, 0.28));
  });

  it('drives the accent shadows from the same accent base', () => {
    expect(themedark.shadow.accentChip).toBe(
      `0 6px 16px -4px ${alpha(accent, 0.5)}`,
    );
    expect(themedark.shadow.accentSoft).toBe(
      `0 6px 6px -6px ${alpha(accent, 0.5)}`,
    );
    expect(themedark.shadow.accentButton).toContain(alpha(accent, 0.6));
  });
});
