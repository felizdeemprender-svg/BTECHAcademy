import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  getLanguageOption,
  getLanguageDirectives,
  SupportedLanguage
} from '../languages';

describe('Sistema de Idiomas y Modismos Regionales (src/lib/languages.ts)', () => {
  it('debe contener exactamente los 4 dialectos e idiomas soportados', () => {
    const ids = SUPPORTED_LANGUAGES.map(l => l.id);
    expect(ids).toEqual(['es-AR', 'es-LA', 'es-ES', 'en-US']);
    expect(SUPPORTED_LANGUAGES.length).toBe(4);
  });

  it('debe definir insignias (badges) correctas para cada variante', () => {
    const badgeMap: Record<SupportedLanguage, string> = {
      'es-AR': 'AR',
      'es-LA': 'LATAM',
      'es-ES': 'ES',
      'en-US': 'US'
    };

    SUPPORTED_LANGUAGES.forEach(lang => {
      expect(lang.badge).toBe(badgeMap[lang.id]);
    });
  });

  it('debe configurar directivas rigurosas de voseo argentino para es-AR', () => {
    const esAR = getLanguageOption('es-AR');
    expect(esAR.aiDirectives).toContain('Español Rioplatense');
    expect(esAR.aiDirectives).toContain('voseo riguroso');
    expect(esAR.aiDirectives).toContain('vos');
    expect(esAR.aiDirectives).toContain('tenés');
    expect(esAR.aiDirectives).toContain('podés');
    expect(esAR.aiDirectives).toContain('PROHIBIDO el tuteo neutro o peninsular');
  });

  it('debe configurar directivas estándar de tuteo neutro para es-LA', () => {
    const esLA = getLanguageOption('es-LA');
    expect(esLA.aiDirectives).toContain('Español Neutro Latinoamericano');
    expect(esLA.aiDirectives).toContain('tuteo estándar internacional');
    expect(esLA.aiDirectives).toContain('tú');
    expect(esLA.aiDirectives).toContain('tienes');
    expect(esLA.aiDirectives).toContain('descubre');
  });

  it('debe configurar directivas peninsulares para es-ES prohibiendo voseo', () => {
    const esES = getLanguageOption('es-ES');
    expect(esES.aiDirectives).toContain('Español de España (Penínsular)');
    expect(esES.aiDirectives).toContain('apúntate');
    expect(esES.aiDirectives).toContain('PROHIBIDO el voseo');
  });

  it('debe configurar directivas en inglés estadounidense para en-US', () => {
    const enUS = getLanguageOption('en-US');
    expect(enUS.aiDirectives).toContain('English (United States)');
    expect(enUS.aiDirectives).toContain('high-converting US English');
  });

  describe('getLanguageOption y resolución por defecto', () => {
    it('debe retornar es-AR ante valores vacíos, nulos o indefinidos', () => {
      expect(getLanguageOption(null).id).toBe('es-AR');
      expect(getLanguageOption(undefined).id).toBe('es-AR');
      expect(getLanguageOption('').id).toBe('es-AR');
    });

    it('debe resolver de forma insensible a mayúsculas y minúsculas', () => {
      expect(getLanguageOption('ES-ar').id).toBe('es-AR');
      expect(getLanguageOption('es-es').id).toBe('es-ES');
      expect(getLanguageOption('EN-US').id).toBe('en-US');
    });

    it('debe caer a es-AR si se pasa un código no soportado', () => {
      expect(getLanguageOption('pt-BR').id).toBe('es-AR');
      expect(getLanguageOption('fr-FR').id).toBe('es-AR');
    });
  });

  describe('getLanguageDirectives', () => {
    it('debe retornar la cadena de directivas correspondiente', () => {
      const directivesAR = getLanguageDirectives('es-AR');
      expect(directivesAR).toBe(getLanguageOption('es-AR').aiDirectives);

      const directivesFallback = getLanguageDirectives(null);
      expect(directivesFallback).toBe(getLanguageOption('es-AR').aiDirectives);
    });
  });

  describe('Cumplimiento de Política de Cero Emojis', () => {
    it('no debe contener emojis en etiquetas, descripciones ni directivas de IA', () => {
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      SUPPORTED_LANGUAGES.forEach(lang => {
        expect(emojiRegex.test(lang.label)).toBe(false);
        expect(emojiRegex.test(lang.shortLabel)).toBe(false);
        expect(emojiRegex.test(lang.badge)).toBe(false);
        expect(emojiRegex.test(lang.description)).toBe(false);
        expect(emojiRegex.test(lang.aiDirectives)).toBe(false);
      });
    });
  });
});
