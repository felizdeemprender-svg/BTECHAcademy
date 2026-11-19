/**
 * Lista de tipografías estándar universales compatibles con web browsers,
 * layouts institucionales y cargadas dinámicamente vía Google Fonts o fuentes de sistema.
 */
export interface AllowedFont {
  name: string;
  category: 'sans-serif' | 'serif' | 'monospace';
  label: string;
}

export const ALLOWED_WEB_FONTS: AllowedFont[] = [
  // Sans-serif modernas y universales
  { name: 'Inter', category: 'sans-serif', label: 'Inter (Sans-serif moderna)' },
  { name: 'Roboto', category: 'sans-serif', label: 'Roboto (Sans-serif limpia)' },
  { name: 'Open Sans', category: 'sans-serif', label: 'Open Sans (Sans-serif legible)' },
  { name: 'Lato', category: 'sans-serif', label: 'Lato (Sans-serif cálida)' },
  { name: 'Montserrat', category: 'sans-serif', label: 'Montserrat (Geométrica institucional)' },
  { name: 'Poppins', category: 'sans-serif', label: 'Poppins (Geométrica amigable)' },
  { name: 'Mulish', category: 'sans-serif', label: 'Mulish (Minimalista)' },
  { name: 'Nunito', category: 'sans-serif', label: 'Nunito (Redondeada suave)' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif', label: 'Plus Jakarta Sans (Moderna corporativa)' },
  { name: 'Space Grotesk', category: 'sans-serif', label: 'Space Grotesk (Tech / Vanguardista)' },
  { name: 'Outfit', category: 'sans-serif', label: 'Outfit (Contemporánea)' },
  { name: 'Manrope', category: 'sans-serif', label: 'Manrope (Semielegante)' },
  { name: 'Arial', category: 'sans-serif', label: 'Arial (Sistema universal)' },
  { name: 'Helvetica', category: 'sans-serif', label: 'Helvetica (Sistema clásico)' },

  // Serif elegantes y editoriales
  { name: 'Playfair Display', category: 'serif', label: 'Playfair Display (Serif de alto impacto)' },
  { name: 'Merriweather', category: 'serif', label: 'Merriweather (Serif de lectura)' },
  { name: 'Lora', category: 'serif', label: 'Lora (Serif literaria)' },
  { name: 'Cormorant Garamond', category: 'serif', label: 'Cormorant Garamond (Serif clásica de lujo)' },
  { name: 'Cinzel', category: 'serif', label: 'Cinzel (Serif romana académica)' },
  { name: 'Georgia', category: 'serif', label: 'Georgia (Sistema serif)' },

  // Monospace técnicas
  { name: 'Source Code Pro', category: 'monospace', label: 'Source Code Pro (Monospace clara)' },
  { name: 'JetBrains Mono', category: 'monospace', label: 'JetBrains Mono (Monospace código)' },
  { name: 'Courier New', category: 'monospace', label: 'Courier New (Sistema mono)' }
];

