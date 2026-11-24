import { describe, it, expect } from 'vitest';
import { splitKineticPhrase, splitSubtitlePhases } from '../text-splitter';

describe('text-splitter: splitKineticPhrase', () => {
  it('respeta salto de línea manual explícito si viene formateado con \\n', () => {
    const raw = '¿Agotada de cambiar\n*HORAS* por dinero?';
    const result = splitKineticPhrase(raw, 5.0);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe('¿Agotada de cambiar');
    expect(result[1].text).toBe('*HORAS* por dinero?');
    expect(result[0].start).toBe(0);
    expect(result[1].end).toBe(5.0);
  });

  it('respeta delimitador explícito con barra vertical |', () => {
    const raw = '¿NEGOCIO *FRENADO*? | *IMPULSA* TU RED';
    const result = splitKineticPhrase(raw, 3.5);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe('¿NEGOCIO *FRENADO*?');
    expect(result[1].text).toBe('*IMPULSA* TU RED');
    expect(result[0].start).toBe(0);
    expect(result[1].end).toBe(3.5);
  });

  it('mantiene en 1 solo bloque frases cortas (<= 5 palabras) sin delimitador explícito como ¿NEGOCIO *FRENADO*?', () => {
    const raw = '¿NEGOCIO *FRENADO*?';
    const result = splitKineticPhrase(raw, 3.5);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe('¿NEGOCIO *FRENADO*?');
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(3.5);
  });

  it('divide automáticamente frases largas en 2 bloques según duración estándar (4.5s)', () => {
    const raw = 'Sanar a otros no debe agotar tu energía vital';
    const result = splitKineticPhrase(raw, 4.5);
    expect(result.length).toBe(2);
    expect(result[0].text).toBeTruthy();
    expect(result[1].text).toBeTruthy();
    expect(result[0].end).toBe(result[1].start);
    expect(result[1].end).toBe(4.5);
  });

  it('mantiene un solo bloque en escenas ultra cortas (< 2.8s) para no saturar lectura', () => {
    const raw = 'Desbloquea tu abundancia hoy mismo';
    const result = splitKineticPhrase(raw, 2.5);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe(raw);
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(2.5);
  });

  it('permite 3 bloques en escenas largas (> 6.0s) con 3 líneas explícitas', () => {
    const raw = 'Línea uno del gancho\nLínea dos del argumento\nLínea tres del llamado';
    const result = splitKineticPhrase(raw, 7.5);
    expect(result.length).toBe(3);
    expect(result[0].text).toBe('Línea uno del gancho');
    expect(result[1].text).toBe('Línea dos del argumento');
    expect(result[2].text).toBe('Línea tres del llamado');
    expect(result[2].end).toBe(7.5);
  });

  it('maneja strings vacíos de forma segura devolviendo array vacío', () => {
    expect(splitKineticPhrase('', 5.0)).toEqual([]);
    expect(splitKineticPhrase(undefined as any, 5.0)).toEqual([]);
  });
});

describe('text-splitter: splitSubtitlePhases', () => {
  it('respeta salto de línea manual explícito para subtítulos', () => {
    const raw = 'Tu terapia sana vidas,\npero vacía tu energía.';
    const result = splitSubtitlePhases(raw, 5.0);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe('Tu terapia sana vidas,');
    expect(result[1].text).toBe('pero vacía tu energía.');
  });

  it('respeta delimitador explícito con barra vertical | en subtítulos', () => {
    const titleBlocks = [{ start: 0, end: 1.75 }, { start: 1.75, end: 3.5 }];
    const raw = 'Si tus ventas cayeron | Te enseño el paso a paso';
    const result = splitSubtitlePhases(raw, 3.5, titleBlocks);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe('Si tus ventas cayeron');
    expect(result[1].text).toBe('Te enseño el paso a paso');
  });

  it('mantiene el subtítulo completo en 1 bloque si el título tiene 1 solo bloque o si es una frase corta sin delimitador', () => {
    const titleBlocks = [{ start: 0, end: 3.5 }];
    const raw = 'Necesitás impulsar tu red';
    const result = splitSubtitlePhases(raw, 3.5, titleBlocks);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe('Necesitás impulsar tu red');
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(3.5);
  });

  it('no divide un subtítulo corto sin puntuación (ej: Necesitás impulsar tu red) aun si el título rota', () => {
    const titleBlocks = [{ start: 0, end: 1.75 }, { start: 1.75, end: 3.5 }];
    const raw = 'Necesitás impulsar tu red';
    const result = splitSubtitlePhases(raw, 3.5, titleBlocks);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe('Necesitás impulsar tu red');
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(3.5);
  });

  it('sincroniza exactamente con los tiempos de inicio y fin de los bloques de título', () => {
    const titleBlocks = [
      { start: 0, end: 2.3 },
      { start: 2.3, end: 5.2 }
    ];
    const raw = 'Primera fase del subtítulo\nSegunda fase del subtítulo';
    const result = splitSubtitlePhases(raw, 5.2, titleBlocks);
    expect(result.length).toBe(2);
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(2.3);
    expect(result[1].start).toBe(2.3);
    expect(result[1].end).toBe(5.2);
  });

  it('divide por puntuación natural (coma, punto) si no hay salto de línea explícito y hay suficientes palabras', () => {
    const titleBlocks = [{ start: 0, end: 2.5 }, { start: 2.5, end: 5.0 }];
    const raw = 'El bloqueo que frena tu negocio, empieza en la culpa al cobrar.';
    const result = splitSubtitlePhases(raw, 5.0, titleBlocks);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe('El bloqueo que frena tu negocio,');
    expect(result[1].text).toBe('empieza en la culpa al cobrar.');
  });
});
