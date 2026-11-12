import { describe, expect, it } from 'vitest';
import { hexToHsl, oklchToHsl, toHslChannels } from '../color-tokens';

describe('theme color token normalization', () => {
  it('preserves space-separated HSL channel triplets', () => {
    expect(toHslChannels('142 71% 45%')).toBe('142 71% 45%');
    expect(toHslChannels('  38.5   92%   50%  ')).toBe('38.5 92% 50%');
  });

  it('unwraps hsl() syntax into space-separated channels', () => {
    expect(toHslChannels('hsl(142, 71%, 45%)')).toBe('142 71% 45%');
    expect(toHslChannels('hsl(330 80% 60%)')).toBe('330 80% 60%');
  });

  it('converts 3-digit and 6-digit hex colors into HSL channels', () => {
    expect(hexToHsl('#ffffff')).toBe('0 0% 100%');
    expect(hexToHsl('#000')).toBe('0 0% 0%');
    expect(toHslChannels('#3B2D86')).toBe('249 50% 35%');
  });

  it('converts rgb() strings into HSL channels', () => {
    expect(toHslChannels('rgb(255, 0, 0)')).toBe('0 100% 50%');
    expect(toHslChannels('rgb(22, 163, 74)')).toBe('142 76% 36%');
  });

  it('converts Fastoria OKLCH semantic tokens into valid HSL channels', () => {
    const hslRegex = /^\d+\s+\d+%\s+\d+%$/;
    const success = oklchToHsl('oklch(55% 0.15 145)');
    const warn = oklchToHsl('oklch(65% 0.15 85)');
    const danger = oklchToHsl('oklch(48% 0.18 30)');

    expect(success).toMatch(hslRegex);
    expect(warn).toMatch(hslRegex);
    expect(danger).toMatch(hslRegex);
    expect(toHslChannels('oklch(98.5% 0 0)')).toBe('0 0% 98%');
  });

  it('returns undefined for invalid or empty tokens', () => {
    expect(toHslChannels(undefined)).toBeUndefined();
    expect(toHslChannels('')).toBeUndefined();
    expect(toHslChannels('not-a-color')).toBeUndefined();
    expect(toHslChannels('oklch(invalid)')).toBeUndefined();
  });
});

