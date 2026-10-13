import { describe, expect, it } from 'vitest';
import {
  AvatarSchema,
  findVoiceById,
  getAvailableAccents,
  getAvailableGenders,
  getAvailableLanguages,
  getAvailableVoices,
  VOICE_CATALOG,
} from '../avatar';

describe('Avatar Domain & Voice Cascading Logic', () => {
  it('contiene voces válidas en el catálogo', () => {
    expect(VOICE_CATALOG.length).toBeGreaterThan(0);
    const tomas = findVoiceById('es-AR-TomasNeural');
    expect(tomas).toBeDefined();
    expect(tomas?.gender).toBe('male');
    expect(tomas?.accent).toBe('AR');
    expect(tomas?.flag).toBe('🇦🇷');
  });

  it('permite filtrar la cascada por Sexo -> Idioma -> Acento -> Voces', () => {
    const genders = getAvailableGenders();
    expect(genders).toHaveLength(2);

    // Idiomas para masculino
    const maleLanguages = getAvailableLanguages('male');
    expect(maleLanguages.some((l) => l.value === 'es')).toBe(true);

    // Acentos para masculino en español
    const maleEsAccents = getAvailableAccents('male', 'es');
    expect(maleEsAccents.some((a) => a.value === 'AR')).toBe(true);
    expect(maleEsAccents.some((a) => a.value === 'MX')).toBe(true);

    // Voces para masculino, español, Argentina
    const arMaleVoices = getAvailableVoices('male', 'es', 'AR');
    expect(arMaleVoices.length).toBeGreaterThan(0);
    expect(arMaleVoices[0].id).toBe('es-AR-TomasNeural');

    // Voces para femenino, español, Argentina
    const arFemaleVoices = getAvailableVoices('female', 'es', 'AR');
    expect(arFemaleVoices.length).toBeGreaterThan(0);
    expect(arFemaleVoices[0].id).toBe('es-AR-ElenaNeural');
  });

  it('valida un Avatar correctamente con AvatarSchema', () => {
    const validAvatar = {
      id: 'avatar-123',
      name: 'Martín - Tech',
      role: 'Instructor',
      gender: 'male',
      language: 'es',
      accent: 'AR',
      voiceProvider: 'edge-tts',
      voiceId: 'es-AR-TomasNeural',
      imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
      imageSource: 'upload',
      isDefault: true,
    };

    const parsed = AvatarSchema.safeParse(validAvatar);
    expect(parsed.success).toBe(true);
  });

  it('falla validación de Avatar si falta nombre o imagen', () => {
    const invalidAvatar = {
      id: 'avatar-123',
      name: '',
      gender: 'male',
      voiceId: 'es-AR-TomasNeural',
      imageUrl: '',
    };

    const parsed = AvatarSchema.safeParse(invalidAvatar);
    expect(parsed.success).toBe(false);
  });
});
