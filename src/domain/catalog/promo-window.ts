/**
 * Catálogo — Ventana promocional de sales pages (colección `salesPages`).
 * Dominio puro: replica EXACTA las dos semánticas legacy observadas:
 * - `courses/marketplace`: solo entiende `activeFrom/activeUntil` con
 *   `.toDate()`; cualquier otra forma (p. ej. `{ seconds }`) se trata
 *   como "sin cota" (el legacy hacía `?.toDate ? ... : null`).
 * - `api/marketplace`: entiende `.toDate()` O `{ seconds }` (admin SDK).
 * NO unificar: cada use-case usa su variante para no cambiar respuestas.
 */
import { toDomainDate } from '../shared/firestore-mapping';

function toPromoDateToDateOnly(value: unknown): Date | null {
  if (typeof value !== 'object' || value === null) return null;
  const toDate = (value as { toDate?: unknown }).toDate;
  if (typeof toDate !== 'function') return null;
  try {
    const date = (toDate as () => unknown)();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

function toPromoDateWithSeconds(value: unknown): Date | null {
  if (typeof value !== 'object' || value === null) return null;
  const withToDate = toPromoDateToDateOnly(value);
  if (withToDate) return withToDate;
  const seconds = (value as { seconds?: unknown }).seconds;
  if (typeof seconds === 'number') {
    const date = toDomainDate({ seconds });
    return date ?? null;
  }
  return null;
}

/**
 * Ventana `promocion` válida: sin `activeFrom` futura ni `activeUntil`
 * pasada. `supportSeconds=true` = semántica `api/marketplace`;
 * `false` = semántica `courses/marketplace`.
 */
export function isPromoWindowValid(
  activeFrom: unknown,
  activeUntil: unknown,
  now: Date,
  supportSeconds: boolean,
): boolean {
  const convert = supportSeconds ? toPromoDateWithSeconds : toPromoDateToDateOnly;
  const fromDate = convert(activeFrom);
  const untilDate = convert(activeUntil);
  if (fromDate && fromDate > now) return false;
  if (untilDate && untilDate < now) return false;
  return true;
}

/** `landingType === 'promocion'` exige ventana válida; el resto siempre pasa. */
export function isSalesPageDateValid(
  landingType: unknown,
  activeFrom: unknown,
  activeUntil: unknown,
  now: Date,
  supportSeconds: boolean,
): boolean {
  if (landingType !== 'promocion') return true;
  return isPromoWindowValid(activeFrom, activeUntil, now, supportSeconds);
}
