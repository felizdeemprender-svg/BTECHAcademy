'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface ThemeConfig {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  themeType: 'institucional' | 'hd' | 'vanguardia';
}

const ThemeContext = createContext<ThemeConfig | undefined>(undefined);

/**
 * Convierte un color HEX a HSL para inyectar en variables CSS de ShadCN.
 */
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const db = useFirestore();
  const configRef = useMemoFirebase(() => doc(db, 'config', 'theme'), [db]);
  const { data: config } = useDoc(configRef);

  const [theme, setTheme] = useState<ThemeConfig>({
    primaryColor: '#3B2D86',
    secondaryColor: '#6366f1',
    accentColor: '#ec4899',
    themeType: 'institucional'
  });

  useEffect(() => {
    if (config) {
      setTheme({
        primaryColor: config.primaryColor || '#3B2D86',
        secondaryColor: config.secondaryColor || '#6366f1',
        accentColor: config.accentColor || '#ec4899',
        themeType: config.themeType || 'institucional'
      });
    }
  }, [config]);

  useEffect(() => {
    const root = document.documentElement;
    const hslPrimary = hexToHsl(theme.primaryColor);
    const hslSecondary = hexToHsl(theme.secondaryColor || theme.primaryColor);
    const hslAccent = hexToHsl(theme.accentColor || theme.primaryColor);
    
    const [h, s] = hslPrimary.split(' ');
    
    // Aplicar clase de premisa de diseño
    root.classList.remove('theme-hd', 'theme-vanguardia', 'theme-institucional');
    root.classList.add(`theme-${theme.themeType}`);

    // Inyectar variables de color maestras
    root.style.setProperty('--primary', hslPrimary);
    root.style.setProperty('--secondary', hslSecondary);
    root.style.setProperty('--accent', hslAccent);
    root.style.setProperty('--ring', hslAccent);
    
    // Generar variaciones de contraste
    root.style.setProperty('--background', `${h} ${s} 98%`);
    root.style.setProperty('--muted', `${h} ${s} 92%`);
    root.style.setProperty('--border', `${h} ${s} 85%`);

    // Sidebar (Elegancia obscura basada en el primario)
    const sidebarBg = `${h} ${s} 8%`;
    root.style.setProperty('--sidebar-background', sidebarBg);
    root.style.setProperty('--sidebar-foreground', '0 0% 98%');
    root.style.setProperty('--sidebar-border', `${h} ${s} 15%`);

  }, [theme]);

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
