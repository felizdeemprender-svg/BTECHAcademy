/**
 * Paso 0 — Convención de mapeo Firestore -> dominio.
 * Solo helpers puros: NO importan firebase, NO tocan Firestore.
 * Los repositorios futuros usarán `toDomainDate` para normalizar
 * Timestamp | segundos | ISO string | millis | Date a Date.
 */

export interface TimestampLike {
  toDate(): Date;
}

interface SecondsLike {
  readonly seconds: number;
}

interface UnderscoreSecondsLike {
  readonly _seconds: number;
}

export type FirestoreDateLike =
  | Date
  | TimestampLike
  | SecondsLike
  | UnderscoreSecondsLike
  | string
  | number
  | null
  | undefined;

function isTimestampLike(value: unknown): value is TimestampLike {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as { toDate?: unknown }).toDate === 'function';
}

function isSecondsLike(value: unknown): value is SecondsLike {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as { seconds?: unknown }).seconds === 'number';
}

function isUnderscoreSecondsLike(value: unknown): value is UnderscoreSecondsLike {
  if (typeof value !== 'object' || value === null) return false;
  return typeof (value as { _seconds?: unknown })._seconds === 'number';
}

function fromMilliseconds(ms: number): Date | undefined {
  if (!Number.isFinite(ms)) return undefined;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Normaliza cualquier representación de fecha usada en Firestore
 * a `Date` de dominio. Devuelve `undefined` si no es convertible.
 */
export function toDomainDate(value: FirestoreDateLike): Date | undefined {
  if (value === null || value === undefined) return undefined;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return fromMilliseconds(typeof value === 'number' ? value : Date.parse(value));
  }

  if (isTimestampLike(value)) {
    try {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : undefined;
    } catch {
      return undefined;
    }
  }

  if (isSecondsLike(value)) return fromMilliseconds(value.seconds * 1000);
  if (isUnderscoreSecondsLike(value)) return fromMilliseconds(value._seconds * 1000);

  return undefined;
}
