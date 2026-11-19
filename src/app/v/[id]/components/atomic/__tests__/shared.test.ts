import { describe, it, expect } from 'vitest';
import {
  contrastTextOn,
  darkenHex,
  hexToRgba,
  parseStat,
} from '../shared';

describe('Atomic Shared Utilities', () => {
  describe('contrastTextOn', () => {
    it('debe devolver texto blanco sobre fondos oscuros', () => {
      expect(contrastTextOn('#000000')).toBe('#FFFFFF');
      expect(contrastTextOn('#111827')).toBe('#FFFFFF');
      expect(contrastTextOn('#3B2D86')).toBe('#FFFFFF');
    });

    it('debe devolver texto oscuro sobre fondos claros', () => {
      expect(contrastTextOn('#FFFFFF')).toBe('#0E0E0F');
      expect(contrastTextOn('#F1F5F9')).toBe('#0E0E0F');
      expect(contrastTextOn('#FACC15')).toBe('#0E0E0F');
    });

    it('debe soportar notacion hex corta de 3 caracteres', () => {
      expect(contrastTextOn('#000')).toBe('#FFFFFF');
      expect(contrastTextOn('#fff')).toBe('#0E0E0F');
    });

    it('debe devolver blanco como fallback seguro si no se envia color', () => {
      expect(contrastTextOn()).toBe('#FFFFFF');
      expect(contrastTextOn('')).toBe('#FFFFFF');
    });
  });

  describe('darkenHex', () => {
    it('debe oscurecer un color hex segun el porcentaje indicado', () => {
      // Blanco #FFFFFF oscurecido 20% -> rgb(204, 204, 204) = #cccccc
      expect(darkenHex('#FFFFFF', 0.2)).toBe('#cccccc');
    });

    it('debe manejar notacion hex de 3 caracteres', () => {
      expect(darkenHex('#fff', 0.5)).toBe('#808080');
    });

    it('debe devolver #000000 si no se envia color', () => {
      expect(darkenHex()).toBe('#000000');
    });
  });

  describe('hexToRgba', () => {
    it('debe convertir un hex a formato rgba con el alpha especificado', () => {
      expect(hexToRgba('#FFFFFF', 0.5)).toBe('rgba(255,255,255,0.5)');
      expect(hexToRgba('#000000', 0.1)).toBe('rgba(0,0,0,0.1)');
    });

    it('debe soportar notacion hex de 3 caracteres', () => {
      expect(hexToRgba('#fff', 0.8)).toBe('rgba(255,255,255,0.8)');
    });

    it('debe usar alpha por defecto 0.06 si no se especifica', () => {
      expect(hexToRgba('#000000')).toBe('rgba(0,0,0,0.06)');
    });

    it('debe devolver rgba fallback si no se proporciona hex', () => {
      expect(hexToRgba('', 0.5)).toBe('rgba(0,0,0,0.5)');
    });
  });

  describe('parseStat', () => {
    it('debe parsear cifras numericas con prefijo o sufijo y etiqueta', () => {
      expect(parseStat('+500 Emprendedores')).toEqual({
        num: '+500',
        label: 'Emprendedores',
      });
      expect(parseStat('98% Satisfacción')).toEqual({
        num: '98%',
        label: 'Satisfacción',
      });
      expect(parseStat('$1.5M En ventas')).toEqual({
        num: '$1.5M',
        label: 'En ventas',
      });
    });

    it('debe limpiar separadores guiones o dos puntos en la etiqueta', () => {
      expect(parseStat('10k - Alumnos activos')).toEqual({
        num: '10k',
        label: 'Alumnos activos',
      });
      expect(parseStat('5.0: Calificación promedio')).toEqual({
        num: '5.0',
        label: 'Calificación promedio',
      });
    });

    it('debe devolver texto integro como num y label vacio si no hay patron numerico', () => {
      expect(parseStat('Comunidad VIP Exclusiva')).toEqual({
        num: 'Comunidad VIP Exclusiva',
        label: '',
      });
    });
  });
});
