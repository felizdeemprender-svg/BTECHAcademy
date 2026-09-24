/**
 * Tests del paso 0: Result, errores, IDs y mapeo de fechas.
 * Dominio puro, sin Firebase.
 */
import { describe, expect, it } from 'vitest';

import { err, isErr, isOk, mapResult, ok, unwrapOr } from '../result';
import {
  conflict,
  forbidden,
  notFound,
  unavailable,
  validationError,
} from '../errors';
import { MentorIdSchema, UserIdSchema, parseMentorId, parseUserId } from '../ids';
import { toDomainDate } from '../firestore-mapping';

describe('result', () => {
  it('ok/isOk exponen el valor', () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    if (isOk(r)) expect(r.value).toBe(42);
  });

  it('err/isErr exponen el error', () => {
    const r = err(notFound('no existe'));
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
    if (isErr(r)) expect(r.error.code).toBe('NOT_FOUND');
  });

  it('mapResult transforma solo Ok', () => {
    expect(mapResult(ok(2), (v) => v * 3)).toEqual(ok(6));
    const e = err(validationError('mal'));
    expect(mapResult(e, (v: number) => v * 3)).toBe(e);
  });

  it('unwrapOr devuelve fallback en Err', () => {
    expect(unwrapOr(ok('x'), 'fb')).toBe('x');
    expect(unwrapOr(err(forbidden('no')), 'fb')).toBe('fb');
  });
});

describe('errors', () => {
  it('construye cada código con mensaje', () => {
    expect(notFound('a').code).toBe('NOT_FOUND');
    expect(validationError('a').code).toBe('VALIDATION');
    expect(forbidden('a').code).toBe('FORBIDDEN');
    expect(conflict('a').code).toBe('CONFLICT');
    expect(unavailable('a').code).toBe('UNAVAILABLE');
  });

  it('details es opcional', () => {
    expect(notFound('a').details).toBeUndefined();
    expect(notFound('a', { id: 1 }).details).toEqual({ id: 1 });
  });
});

describe('ids', () => {
  it('acepta strings no vacíos', () => {
    expect(UserIdSchema.parse('u123')).toBe('u123');
    expect(MentorIdSchema.parse('m123')).toBe('m123');
    expect(parseUserId('u1')).toBe('u1');
    expect(parseMentorId('m1')).toBe('m1');
  });

  it('rechaza vacío y no-strings', () => {
    expect(() => UserIdSchema.parse('')).toThrow();
    expect(() => UserIdSchema.parse(123)).toThrow();
    expect(() => parseMentorId('')).toThrow();
  });
});

describe('toDomainDate', () => {
  it('pasa Date válida y rechaza inválida', () => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    expect(toDomainDate(d)).toBe(d);
    expect(toDomainDate(new Date('nope'))).toBeUndefined();
  });

  it('convierte Timestamp-like, seconds y _seconds', () => {
    const d = new Date('2026-02-01T00:00:00.000Z');
    expect(toDomainDate({ toDate: () => d })).toEqual(d);
    expect(toDomainDate({ seconds: d.getTime() / 1000 })).toEqual(d);
    expect(toDomainDate({ _seconds: d.getTime() / 1000 })).toEqual(d);
  });

  it('convierte ISO string y millis', () => {
    expect(toDomainDate('2026-03-01T00:00:00.000Z')).toEqual(
      new Date('2026-03-01T00:00:00.000Z'),
    );
    const ms = Date.parse('2026-03-01T00:00:00.000Z');
    expect(toDomainDate(ms)).toEqual(new Date(ms));
  });

  it('null/undefined/inválidos devuelven undefined', () => {
    expect(toDomainDate(null)).toBeUndefined();
    expect(toDomainDate(undefined)).toBeUndefined();
    expect(toDomainDate('no-fecha')).toBeUndefined();
    expect(toDomainDate({ toDate: () => { throw new Error('x'); } })).toBeUndefined();
  });
});
