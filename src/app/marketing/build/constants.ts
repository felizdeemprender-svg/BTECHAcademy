export interface AdnCatalogItem {
  id: string;
  name: string;
  tag: string;
  desc: string;
}

export const ADN_CATALOG: AdnCatalogItem[] = [
  { id: '01_CINEMA', name: 'Cinema Master', tag: 'Cinematográfico', desc: 'Look 35mm, iluminación dramática y contraste natural de alta gama.' },
  { id: '02_LUXURYGO', name: 'Luxury Gold', tag: 'Lujo y Prestigio', desc: 'Elegancia sobria, detalles dorados y atmósfera de exclusividad.' },
  { id: '03_CORPORAT', name: 'Corporate B2B', tag: 'Autoridad B2B', desc: 'Formal, métricas claras, foco en ROI y solidez institucional.' },
  { id: '05_MINIMALD', name: 'Minimal Design', tag: 'Editorial Suizo', desc: 'Tipografía nítida, layout limpio y foco absoluto en el mensaje.' },
  { id: '06_FASTCUT', name: 'Fast Cut', tag: 'Alta Retención', desc: 'Ritmo acelerado, transiciones ágiles y dinamismo para redes jóvenes.' },
  { id: '08_BOLDREELS', name: 'Bold Reels', tag: 'Impacto Visual', desc: 'Titulares gigantescos, ganchos visuales potentes y estilo viral.' },
  { id: '10_ZENHARMONY', name: 'Zen Harmony', tag: 'Salud y Calma', desc: 'Tonos serenos, ritmo suave, balance y estética orgánica.' },
  { id: '04_GAMINGGL', name: 'Gaming Glow', tag: 'Tech y Futuro', desc: 'Estética neón, acentos vibrantes e intensidad visual.' }
];

export const ADN_FALLBACK_IMAGES: Record<string, string> = {
  '01_CINEMA': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1080&q=80',
  '02_LUXURYGO': 'https://images.unsplash.com/photo-1513094735237-8f2714d57c13?auto=format&fit=crop&w=1080&q=80',
  '03_CORPORAT': 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1080&q=80',
  '04_GAMINGGL': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1080&q=80',
  '05_MINIMALD': 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1080&q=80',
  '06_FASTCUT': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1080&q=80',
  '08_BOLDREELS': 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1080&q=80',
  '10_ZENHARMONY': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1080&q=80'
};
