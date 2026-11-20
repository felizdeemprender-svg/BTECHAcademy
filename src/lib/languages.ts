/**
 * Configuraciones de idioma y modismos regionales para generación de contenido con IA.
 * Soporta variantes dialectales (Rioplatense, Neutro Latam, Peninsular España, Inglés).
 */

export type SupportedLanguage = 'es-AR' | 'es-LA' | 'es-ES' | 'en-US';

export interface LanguageOption {
  readonly id: SupportedLanguage;
  readonly code: SupportedLanguage;
  readonly label: string;
  readonly shortLabel: string;
  readonly badge: string;
  readonly description: string;
  readonly aiDirectives: string;
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  {
    id: 'es-AR',
    code: 'es-AR',
    label: 'Español Rioplatense (Argentina / Uruguay)',
    shortLabel: 'Rioplatense (AR)',
    badge: 'AR',
    description: 'Voseo natural: vos, tenés, descubrí, sumate, hacé, mirá.',
    aiDirectives: `MODISMO Y DIALECTO OBLIGATORIO: Español Rioplatense (Argentina/Uruguay).
- Debes usar el voseo riguroso en segunda persona: usa "vos", "tenés", "podés", "descubrí", "sumate", "hacé", "inscribite", "mirá", "empezá", "lográ", "armá", "conocé".
- PROHIBIDO el tuteo neutro o peninsular (NO uses "tú", "tienes", "puedes", "descubre", "únete", "inscríbete", "hazlo", "empieza").
- Mantén un tono profesional, cercano, empático y auténtico rioplatense, sin modismos lunfardos exagerados pero con naturalidad argentina.`
  },
  {
    id: 'es-LA',
    code: 'es-LA',
    label: 'Español Neutro (Latinoamérica)',
    shortLabel: 'Neutro (Latam)',
    badge: 'LATAM',
    description: 'Tuteo estándar internacional: tú, tienes, descubre, únete.',
    aiDirectives: `MODISMO Y DIALECTO OBLIGATORIO: Español Neutro Latinoamericano.
- Usa el tuteo estándar internacional en segunda persona: "tú", "tienes", "puedes", "descubre", "únete", "inscríbete", "mira", "empieza", "logra", "hazlo".
- Evita modismos locales o regionalismos específicos de un solo país.`
  },
  {
    id: 'es-ES',
    code: 'es-ES',
    label: 'Español Peninsular (España)',
    shortLabel: 'España (ES)',
    badge: 'ES',
    description: 'Tuteo y giros de España: tú tienes, apúntate, descubre.',
    aiDirectives: `MODISMO Y DIALECTO OBLIGATORIO: Español de España (Penínsular).
- Usa la segunda persona peninsular: "tú tienes", "descubre", "apúntate", "inscríbete", "echa un vistazo", "hazte con".
- PROHIBIDO el voseo (no uses "vos", "tenés", "hacé").`
  },
  {
    id: 'en-US',
    code: 'en-US',
    label: 'English (US)',
    shortLabel: 'English (US)',
    badge: 'US',
    description: 'American English: you, discover, join now, start.',
    aiDirectives: `MANDATORY LANGUAGE: English (United States).
- All generated texts (headlines, paragraphs, bullets, voiceovers, on-screen text, hooks, captions) must be written in natural, high-converting US English.`
  }
];

export function getLanguageOption(langId?: string | null): LanguageOption {
  if (!langId) return SUPPORTED_LANGUAGES[0];
  const found = SUPPORTED_LANGUAGES.find(l => l.id.toLowerCase() === langId.toLowerCase());
  return found || SUPPORTED_LANGUAGES[0];
}

export function getLanguageDirectives(langId?: string | null): string {
  return getLanguageOption(langId).aiDirectives;
}
