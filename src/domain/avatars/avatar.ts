/**
 * @fileOverview Dominio de Avatares (Identidad, Rostro y Catálogo de Voces).
 * Dominio de primer nivel desacoplado, transversal a Video, Marketing y Chat.
 */

import { z } from 'zod';

export type AvatarGender = 'male' | 'female';

export interface AvatarVoice {
  id: string;
  name: string;
  gender: AvatarGender;
  language: string;
  languageName: string;
  accent: string;
  accentName: string;
  flag: string;
  description: string;
  sampleText: string;
  provider: 'edge-tts' | 'elevenlabs' | 'cloned';
}

/** Catálogo oficial de voces disponibles preconfiguradas */
export const VOICE_CATALOG: AvatarVoice[] = [
  // 🇦🇷 Argentina (Español)
  {
    id: 'es-AR-TomasNeural',
    name: 'Tomás',
    gender: 'male',
    language: 'es',
    languageName: 'Español',
    accent: 'AR',
    accentName: 'Argentina',
    flag: '🇦🇷',
    description: 'Joven, enérgico y con acento rioplatense natural.',
    sampleText: '¡Hola! Soy Tomás, tu avatar presentador en Felizdeemprender.',
    provider: 'edge-tts',
  },
  {
    id: 'es-AR-ElenaNeural',
    name: 'Elena',
    gender: 'female',
    language: 'es',
    languageName: 'Español',
    accent: 'AR',
    accentName: 'Argentina',
    flag: '🇦🇷',
    description: 'Cálida, clara y profesional con tono rioplatense.',
    sampleText: 'Hola a todos, soy Elena y te doy la bienvenida a este contenido.',
    provider: 'edge-tts',
  },

  // 🇲🇽 México (Español)
  {
    id: 'es-MX-JorgeNeural',
    name: 'Jorge',
    gender: 'male',
    language: 'es',
    languageName: 'Español',
    accent: 'MX',
    accentName: 'México',
    flag: '🇲🇽',
    description: 'Dinámico, versátil y con tono comercial moderno.',
    sampleText: '¿Qué tal amigos? Soy Jorge y hoy vamos a ver una lección clave.',
    provider: 'edge-tts',
  },
  {
    id: 'es-MX-DaliaNeural',
    name: 'Dalia',
    gender: 'female',
    language: 'es',
    languageName: 'Español',
    accent: 'MX',
    accentName: 'México',
    flag: '🇲🇽',
    description: 'Amigable, empática y con cadencia fluida.',
    sampleText: 'Hola, soy Dalia. Acompáñame a descubrir las mejores herramientas.',
    provider: 'edge-tts',
  },

  // 🇨🇴 Colombia (Español)
  {
    id: 'es-CO-GonzaloNeural',
    name: 'Gonzalo',
    gender: 'male',
    language: 'es',
    languageName: 'Español',
    accent: 'CO',
    accentName: 'Colombia',
    flag: '🇨🇴',
    description: 'Formal, sereno y con articulación impecable.',
    sampleText: 'Un cordial saludo, soy Gonzalo y estaré guiándote en esta sesión.',
    provider: 'edge-tts',
  },
  {
    id: 'es-CO-SalomeNeural',
    name: 'Salomé',
    gender: 'female',
    language: 'es',
    languageName: 'Español',
    accent: 'CO',
    accentName: 'Colombia',
    flag: '🇨🇴',
    description: 'Motivadora, expresiva y cercana.',
    sampleText: '¡Hola! Soy Salomé, feliz de compartir esta clase con vos.',
    provider: 'edge-tts',
  },

  // 🇪🇸 España (Español)
  {
    id: 'es-ES-AlvaroNeural',
    name: 'Álvaro',
    gender: 'male',
    language: 'es',
    languageName: 'Español',
    accent: 'ES',
    accentName: 'España',
    flag: '🇪🇸',
    description: 'Directo, seguro y de estilo europeo sobrio.',
    sampleText: 'Hola, soy Álvaro. Vamos a revisar los conceptos fundamentales.',
    provider: 'edge-tts',
  },
  {
    id: 'es-ES-ElviraNeural',
    name: 'Elvira',
    gender: 'female',
    language: 'es',
    languageName: 'Español',
    accent: 'ES',
    accentName: 'España',
    flag: '🇪🇸',
    description: 'Académica, serena y de dicción cuidada.',
    sampleText: 'Bienvenidos, soy Elvira y comenzaremos analizando los objetivos.',
    provider: 'edge-tts',
  },

  // 🌎 EE.UU. / Neutro Latino (Español)
  {
    id: 'es-US-AlonsoNeural',
    name: 'Alonso',
    gender: 'male',
    language: 'es',
    languageName: 'Español',
    accent: 'US',
    accentName: 'Latino Neutro',
    flag: '🌎',
    description: 'Corporativo, neutro y ampliamente aceptado en toda América Latina.',
    sampleText: 'Hola a todos, mi nombre es Alonso y los acompañaré en este módulo.',
    provider: 'edge-tts',
  },
  {
    id: 'es-US-PalomaNeural',
    name: 'Paloma',
    gender: 'female',
    language: 'es',
    languageName: 'Español',
    accent: 'US',
    accentName: 'Latino Neutro',
    flag: '🌎',
    description: 'Elegante, equilibrada y sin modismos locales.',
    sampleText: 'Hola, soy Paloma. Descubramos juntos el potencial de tu negocio.',
    provider: 'edge-tts',
  },

  // 🇺🇸 English (US)
  {
    id: 'en-US-GuyNeural',
    name: 'Guy',
    gender: 'male',
    language: 'en',
    languageName: 'English',
    accent: 'US-EN',
    accentName: 'United States',
    flag: '🇺🇸',
    description: 'Natural, confident and articulate North American voice.',
    sampleText: 'Hello! I am Guy, your virtual presenter today.',
    provider: 'edge-tts',
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny',
    gender: 'female',
    language: 'en',
    languageName: 'English',
    accent: 'US-EN',
    accentName: 'United States',
    flag: '🇺🇸',
    description: 'Warm, conversational and friendly North American voice.',
    sampleText: 'Hi there! I am Jenny, ready to help you learn.',
    provider: 'edge-tts',
  },

  // 🇧🇷 Português (Brasil)
  {
    id: 'pt-BR-AntonioNeural',
    name: 'Antônio',
    gender: 'male',
    language: 'pt',
    languageName: 'Português',
    accent: 'BR',
    accentName: 'Brasil',
    flag: '🇧🇷',
    description: 'Voz brasileira clara, engajadora e confiável.',
    sampleText: 'Olá! Eu sou o Antônio e hoje vamos acelerar os seus resultados.',
    provider: 'edge-tts',
  },
  {
    id: 'pt-BR-FranciscaNeural',
    name: 'Francisca',
    gender: 'female',
    language: 'pt',
    languageName: 'Português',
    accent: 'BR',
    accentName: 'Brasil',
    flag: '🇧🇷',
    description: 'Acolhedora, profissional e de fácil compreensão.',
    sampleText: 'Boas-vindas! Meu nome é Francisca e estarei com você neste curso.',
    provider: 'edge-tts',
  },
];

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers de Cascada: Sexo (1) ➔ Idioma (2) ➔ Acento (3) ➔ Voces (4)
 * ────────────────────────────────────────────────────────────────────────── */

export function getAvailableGenders(): Array<{ value: AvatarGender; label: string }> {
  return [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Femenino' },
  ];
}

export function getAvailableLanguages(gender?: AvatarGender): Array<{ value: string; label: string }> {
  const filtered = gender ? VOICE_CATALOG.filter((v) => v.gender === gender) : VOICE_CATALOG;
  const map = new Map<string, string>();
  for (const item of filtered) {
    if (!map.has(item.language)) {
      map.set(item.language, item.languageName);
    }
  }
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
}

export function getAvailableAccents(
  gender?: AvatarGender,
  language?: string
): Array<{ value: string; label: string; flag: string }> {
  let filtered = VOICE_CATALOG;
  if (gender) filtered = filtered.filter((v) => v.gender === gender);
  if (language) filtered = filtered.filter((v) => v.language === language);

  const map = new Map<string, { label: string; flag: string }>();
  for (const item of filtered) {
    if (!map.has(item.accent)) {
      map.set(item.accent, { label: item.accentName, flag: item.flag });
    }
  }
  return Array.from(map.entries()).map(([value, { label, flag }]) => ({ value, label, flag }));
}

export function getAvailableVoices(
  gender?: AvatarGender,
  language?: string,
  accent?: string
): AvatarVoice[] {
  let filtered = VOICE_CATALOG;
  if (gender) filtered = filtered.filter((v) => v.gender === gender);
  if (language) filtered = filtered.filter((v) => v.language === language);
  if (accent) filtered = filtered.filter((v) => v.accent === accent);
  return filtered;
}

export function findVoiceById(voiceId: string): AvatarVoice | undefined {
  return VOICE_CATALOG.find((v) => v.id === voiceId);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Schemas Zod de Dominio
 * ────────────────────────────────────────────────────────────────────────── */

export const AvatarVoiceProviderSchema = z.enum(['edge-tts', 'elevenlabs', 'cloned', 'cloned-voice']);
export type AvatarVoiceProvider = z.infer<typeof AvatarVoiceProviderSchema>;

export const AvatarImageSourceSchema = z.enum(['upload', 'ai-generated', 'preset']);
export type AvatarImageSource = z.infer<typeof AvatarImageSourceSchema>;

export const AvatarSchema = z.object({
  id: z.string().min(1, 'ID obligatorio'),
  userId: z.string().optional(),
  name: z.string().min(1, 'El nombre del avatar es obligatorio'),
  role: z.string().optional().default('Mentor / Presentador'),
  gender: z.enum(['male', 'female']),
  language: z.string().default('es'),
  accent: z.string().default('AR'),
  voiceProvider: AvatarVoiceProviderSchema.default('edge-tts'),
  voiceId: z.string().optional().default('es-AR-TomasNeural'),
  customVoiceUrl: z.string().optional(),
  clonedAudioUrl: z.string().optional(),
  imageUrl: z.string().min(1, 'Debes proporcionar una imagen de rostro'),
  imageSource: AvatarImageSourceSchema.default('upload'),
  isDefault: z.boolean().default(false),
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
});

export type Avatar = z.infer<typeof AvatarSchema>;
export type NewAvatar = z.input<typeof AvatarSchema>;

/** Avatares oficiales maestros con fondo croma listos para render */
export const INITIAL_DEFAULT_AVATARS: Avatar[] = [
  {
    id: 'avatar-tomas-ar',
    name: 'Tomás — Presentador Tech',
    role: 'Instructor y Anuncios de Marketing',
    gender: 'male',
    language: 'es',
    accent: 'AR',
    voiceProvider: 'edge-tts',
    voiceId: 'es-AR-TomasNeural',
    imageUrl: '/avatars/avatar_chroma_male.jpg',
    imageSource: 'ai-generated',
    isDefault: true,
  },
  {
    id: 'avatar-elena-ar',
    name: 'Elena — Educadora',
    role: 'Clases Teóricas y Bienvenidas',
    gender: 'female',
    language: 'es',
    accent: 'AR',
    voiceProvider: 'edge-tts',
    voiceId: 'es-AR-ElenaNeural',
    imageUrl: '/avatars/avatar_chroma_female.jpg',
    imageSource: 'ai-generated',
    isDefault: false,
  },
  {
    id: 'avatar-jorge-mx',
    name: 'Jorge — Comercial',
    role: 'Campañas de Prospección y Ventas',
    gender: 'male',
    language: 'es',
    accent: 'MX',
    voiceProvider: 'edge-tts',
    voiceId: 'es-MX-JorgeNeural',
    imageUrl: '/avatars/avatar_chroma_latin.jpg',
    imageSource: 'ai-generated',
    isDefault: false,
  },
];

export interface AvatarRepository {
  listByUser(userId: string): Promise<Avatar[]>;
  getById(userId: string, avatarId: string): Promise<Avatar | null>;
  getDefault(userId: string): Promise<Avatar | null>;
  save(userId: string, avatar: Avatar): Promise<Avatar>;
  delete(userId: string, avatarId: string): Promise<{ deleted: boolean; newDefaultId?: string }>;
  seedDefaults(userId: string): Promise<Avatar[]>;
}

