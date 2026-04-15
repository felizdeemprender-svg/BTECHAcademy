
export const MASTER_PRESETS = [
  {
    id: '01',
    name: 'Academy Auth',
    description: 'Estética académica y de autoridad. Ideal para cursos magistrales y programas de certificación con un look institucional premium.',
    feeling: 'Autoridad & Academia',
    designTokens: {
      primary: '#3B2D86',
      secondary: '#F0EEF6',
      accent: '#2680E5',
      fontHeading: 'Space Grotesk',
      fontBody: 'Inter'
    },
    features: ['Vignette cinematográfico', 'Bloques sólidos', 'Tipografía técnica']
  },
  {
    id: '02',
    name: 'Glass Premium',
    description: 'Estilo moderno con efectos de cristal y desenfoque (Glassmorphism). Optimizado para atrapar la atención en TikTok e Instagram.',
    feeling: 'Moderno & Viral',
    designTokens: {
      primary: '#0F172A',
      secondary: '#F8FAFC',
      accent: '#6366F1',
      fontHeading: 'Inter',
      fontBody: 'Inter'
    },
    features: ['Backdrop blur', 'Bordes brillantes', 'Alta velocidad visual']
  },
  {
    id: '03',
    name: 'Kinetic Flow',
    description: 'Diseño minimalista de lujo enfocado en la fluidez y el movimiento. Elegancia pura para marcas que buscan sofisticación.',
    feeling: 'Lujo & Fluidez',
    designTokens: {
      primary: '#18181B',
      secondary: '#FAFAFA',
      accent: '#F43F5E',
      fontHeading: 'Inter',
      fontBody: 'Inter'
    },
    features: ['Minimalismo extremo', 'Colores vibrantes', 'Espaciado generoso']
  },
  {
    id: '04',
    name: 'Dark Insight',
    description: 'Contraste máximo B2B. Estética profesional de "Modo Oscuro" para insights tecnológicos y mentorías ejecutivas.',
    feeling: 'Ejecutivo & Tech',
    designTokens: {
      primary: '#000000',
      secondary: '#18181B',
      accent: '#10B981',
      fontHeading: 'Inter',
      fontBody: 'Inter'
    },
    features: ['Alto contraste', 'Neon accents', 'Look profesional nocturno']
  },
  {
    id: '05',
    name: 'Impact Block',
    description: 'El estilo más agresivo y directo. Texto central colosal y saturación extrema para campañas de impacto masivo.',
    feeling: 'Impacto & Escala',
    designTokens: {
      primary: '#000000',
      secondary: '#FFFFFF',
      accent: '#FACC15',
      fontHeading: 'Inter',
      fontBody: 'Inter'
    },
    features: ['Texto gigante', 'Saturación máxima', 'Directo al grano']
  }
];

export type MasterPreset = typeof MASTER_PRESETS[0];
