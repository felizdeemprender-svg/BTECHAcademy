'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface ThemeConfig {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  themeType: 'institucional' | 'hd' | 'vanguardia';
  logoType?: 'arc' | 'monogram' | 'diamond';
  brandTokens?: any;
}

const ThemeContext = createContext<ThemeConfig | undefined>(undefined);

const STORAGE_KEY = 'fastoria-active-brand';

const ORIGINAL_TOKENS = {
  fastoria: {
    color: {
      'bg':           { $value: 'oklch(98.5% 0 0)' },
      'surface':      { $value: 'oklch(100% 0 0)' },
      'fg':           { $value: 'oklch(14.5% 0.035 290)' },
      'fg-2':         { $value: 'oklch(32% 0.025 290)' },
      'muted':        { $value: 'oklch(46% 0.015 290)' },
      'border':       { $value: 'oklch(82.5% 0.02 295)' },
      'border-soft':  { $value: 'oklch(92% 0.01 290)' },
      'accent':       { $value: 'oklch(58% 0.19 340)' },
      'accent-muted': { $value: 'oklch(75% 0.10 335)' },
      'accent-light': { $value: 'oklch(90% 0.04 330)' },
      'accent-on':    { $value: 'oklch(100% 0 0)' },
      'success':      { $value: 'oklch(55% 0.15 145)' },
      'warn':         { $value: 'oklch(65% 0.15 85)' },
      'danger':       { $value: 'oklch(48% 0.18 30)' }
    },
    'shadcn-hsl': {
      'background':           { $value: '0 0% 98%' },
      'foreground':           { $value: '240 28% 14%' },
      'card':                 { $value: '0 0% 100%' },
      'card-foreground':      { $value: '240 28% 14%' },
      'popover':              { $value: '0 0% 100%' },
      'popover-foreground':   { $value: '240 28% 14%' },
      'primary':              { $value: '249 50% 35%' },
      'primary-foreground':   { $value: '0 0% 100%' },
      'secondary':            { $value: '260 20% 92%' },
      'secondary-foreground': { $value: '240 28% 14%' },
      'muted':                { $value: '260 20% 92%' },
      'muted-foreground':     { $value: '260 10% 46%' },
      'accent':               { $value: '330 80% 60%' },
      'accent-foreground':    { $value: '0 0% 100%' },
      'destructive':          { $value: '0 72% 48%' },
      'destructive-foreground': { $value: '0 0% 100%' },
      'border':               { $value: '260 18% 83%' },
      'input':                { $value: '260 18% 83%' },
      'ring':                 { $value: '330 80% 60%' },
      'radius':               { $value: '0.5rem' }
    },
    'radius': {
      'sm':   { $value: '6px' },
      'md':   { $value: '12px' },
      'lg':   { $value: '24px' },
      'card': { $value: '2.5rem' }
    },
    'elevation': {
      'shadow':       { $value: 'none' },
      'card-shadow':  { $value: '0 20px 60px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.03)' },
      'border-width': { $value: '1px' }
    },
    'typography': {
      'font-display': { $value: 'Lexend' },
      'font-body':    { $value: 'Inter' },
      'font-mono':    { $value: 'Source Code Pro' }
    },
    'theme': {
      'active':         { $value: 'institucional' },
      'logo-selected':  { $value: 'arc' }
    },
    'sidebar': {
      'background':          { $value: '240 30% 10%' },
      'foreground':          { $value: '260 15% 95%' },
      'border':              { $value: '240 30% 6%' },
      'accent':              { $value: '330 80% 60%' },
      'accent-foreground':   { $value: '0 0% 100%' },
      'ring':                { $value: '330 80% 60%' },
      'primary':             { $value: '330 80% 60%' },
      'primary-foreground':  { $value: '0 0% 100%' }
    }
  }
};

function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function setCSS(key: string, value: string | undefined) {
  if (value !== undefined && value !== null) {
    document.documentElement.style.setProperty(key, value);
  }
}

function setCSSClass(klass: string, add: boolean) {
  document.documentElement.classList.toggle(klass, add);
}

function applyBrandTokens(tokens: any) {
  const t = tokens?.fastoria;
  if (!t) return;

  const c = t.color || {};
  setCSS('--bg', c.bg?.$value);
  setCSS('--surface', c.surface?.$value);
  setCSS('--fg', c.fg?.$value);
  setCSS('--fg-2', c['fg-2']?.$value);
  setCSS('--muted', c.muted?.$value);
  setCSS('--border', c.border?.$value);
  setCSS('--border-soft', c['border-soft']?.$value);
  setCSS('--accent', c.accent?.$value);
  setCSS('--accent-muted', c['accent-muted']?.$value);
  setCSS('--accent-light', c['accent-light']?.$value);
  setCSS('--accent-on', c['accent-on']?.$value);
  setCSS('--success', c.success?.$value);
  setCSS('--warn', c.warn?.$value);
  setCSS('--danger', c.danger?.$value);

  const h = t['shadcn-hsl'] || {};
  setCSS('--background', h.background?.$value);
  setCSS('--foreground', h.foreground?.$value);
  setCSS('--card', h.card?.$value);
  setCSS('--card-foreground', h['card-foreground']?.$value);
  setCSS('--popover', h.popover?.$value);
  setCSS('--popover-foreground', h['popover-foreground']?.$value);
  setCSS('--primary', h.primary?.$value);
  setCSS('--primary-foreground', h['primary-foreground']?.$value);
  setCSS('--secondary', h.secondary?.$value);
  setCSS('--secondary-foreground', h['secondary-foreground']?.$value);
  setCSS('--muted', h.muted?.$value);
  setCSS('--muted-foreground', h['muted-foreground']?.$value);
  setCSS('--accent', h.accent?.$value);
  setCSS('--accent-foreground', h['accent-foreground']?.$value);
  setCSS('--destructive', h.destructive?.$value);
  setCSS('--destructive-foreground', h['destructive-foreground']?.$value);
  setCSS('--border', h.border?.$value);
  setCSS('--input', h.input?.$value);
  setCSS('--ring', h.ring?.$value);
  setCSS('--radius', h.radius?.$value);

  const e = t.radius || {};
  setCSS('--radius-sm', e.sm?.$value);
  setCSS('--radius-md', e.md?.$value);
  setCSS('--radius-lg', e.lg?.$value);
  setCSS('--card-radius', e.card?.$value);

  const v = t.elevation || {};
  setCSS('--prof-shadow', v.shadow?.$value);
  setCSS('--card-shadow', v['card-shadow']?.$value);
  setCSS('--prof-border-width', v['border-width']?.$value);

  const p = t.typography || {};
  if (p['font-display']?.$value) setCSS('--font-display', `"${p['font-display'].$value}", sans-serif`);
  if (p['font-body']?.$value) setCSS('--font-body', `"${p['font-body'].$value}", sans-serif`);
  if (p['font-mono']?.$value) setCSS('--font-mono', `"${p['font-mono'].$value}", monospace`);

  const l = t.theme || {};
  if (l['logo-selected']?.$value) setCSS('--logo-type', l['logo-selected'].$value);
  if (l.active?.$value) {
    setCSSClass('theme-hd', l.active.$value === 'hd');
    setCSSClass('theme-vanguardia', l.active.$value === 'vanguardia');
    setCSSClass('theme-institucional', l.active.$value === 'institucional');
  }

  const b = t.sidebar || {};
  setCSS('--sidebar-background', b.background?.$value);
  setCSS('--sidebar-foreground', b.foreground?.$value);
  setCSS('--sidebar-border', b.border?.$value);
  setCSS('--sidebar-accent', b.accent?.$value);
  setCSS('--sidebar-accent-foreground', b['accent-foreground']?.$value);
  setCSS('--sidebar-ring', b.ring?.$value);
  setCSS('--sidebar-primary', b.primary?.$value);
  setCSS('--sidebar-primary-foreground', b['primary-foreground']?.$value);

  setCSS('--card-bg', '#ffffff');
  setCSS('--card-border', 'none');
  if (e.card?.$value) setCSS('--card-radius', e.card.$value);
  if (v['card-shadow']?.$value) setCSS('--card-shadow', v['card-shadow'].$value);
}

function buildThemeConfig(tokens: any): ThemeConfig {
  const t = tokens?.fastoria || {};
  const h = t['shadcn-hsl'] || {};
  return {
    primaryColor: h.primary?.$value ? `hsl(${h.primary.$value})` : '#3B2D86',
    secondaryColor: `hsl(${h.primary?.$value || '18 55% 52%'})`,
    accentColor: `hsl(${h.accent?.$value || '18 55% 52%'})`,
    themeType: t.theme?.active?.$value || 'institucional',
    logoType: t.theme?.['logo-selected']?.$value || 'arc',
    brandTokens: tokens
  };
}

function saveToCache(tokens: any) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens)); } catch { /* noop */ }
}

function loadFromCache(): any | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#3B2D86',
  secondaryColor: '#6366f1',
  accentColor: '#ec4899',
  themeType: 'institucional',
  logoType: 'arc'
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const db = useFirestore();
  const brandsRef = useMemoFirebase(() => doc(db, 'config', 'brands'), [db]);
  const brandRef = useMemoFirebase(() => doc(db, 'config', 'brand'), [db]);
  const configRef = useMemoFirebase(() => doc(db, 'config', 'theme'), [db]);

  const { data: brandsDoc } = useDoc(brandsRef);
  const { data: brandDoc } = useDoc(brandRef);
  const { data: config } = useDoc(configRef);

  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);

  // ══ 1. Restore cached brand on mount (instant, matches preload <script>) ══
  useEffect(() => {
    const cached = loadFromCache();
    if (cached?.fastoria) {
      applyBrandTokens(cached);
      setTheme(buildThemeConfig(cached));
    }
  }, []);

  // ══ 2. Resolve from Firestore once brandsDoc loads (highest priority) ══
  useEffect(() => {
    if (brandsDoc === undefined) return;

    let tokens: any = null;

    const items: any[] = brandsDoc?.items || [];
    const activeId: string | null = brandsDoc?.activeId || null;
    const active = items.find((b: any) => b.id === activeId);
    if (active?.tokens?.fastoria) {
      tokens = active.tokens;
    }

    if (!tokens && brandDoc?.tokens?.fastoria) {
      tokens = brandDoc.tokens;
    }

    if (!tokens && config) {
      const root = document.documentElement;
      const hslPrimary = hexToHsl(config.primaryColor || '#3B2D86');
      const hslAccent = hexToHsl(config.accentColor || config.primaryColor || '#ec4899');
      const [h, s] = hslPrimary.split(' ');

      setCSSClass('theme-hd', config.themeType === 'hd');
      setCSSClass('theme-vanguardia', config.themeType === 'vanguardia');
      setCSSClass('theme-institucional', config.themeType === 'institucional' || !config.themeType);

      setCSS('--primary', hslPrimary);
      setCSS('--accent', hslAccent);
      setCSS('--ring', hslAccent);
      setCSS('--background', `${h} ${s} 98%`);
      setCSS('--muted', `${h} ${s} 92%`);
      setCSS('--border', `${h} ${s} 85%`);
      setCSS('--sidebar-background', `${h} ${s} 8%`);
      setCSS('--sidebar-foreground', '0 0% 98%');
      setCSS('--sidebar-border', `${h} ${s} 15%`);
      setCSS('--logo-type', config.logoType || 'arc');

      setTheme({
        primaryColor: config.primaryColor || '#3B2D86',
        secondaryColor: config.secondaryColor || '#6366f1',
        accentColor: config.accentColor || '#ec4899',
        themeType: config.themeType || 'institucional',
        logoType: config.logoType || 'arc',
        brandTokens: undefined
      });
      return;
    }

    if (!tokens) {
      tokens = ORIGINAL_TOKENS;
    }

    if (tokens?.fastoria) {
      applyBrandTokens(tokens);
      saveToCache(tokens);
      setTheme(buildThemeConfig(tokens));
    }
  }, [brandsDoc, brandDoc, config]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme debe usarse dentro de ThemeProvider');
  return context;
};
