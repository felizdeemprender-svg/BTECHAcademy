/**
 * Reglas de Ciclo de Vida y Vigencia de Landings de Venta (Fastoria Domain)
 *
 * Reglas mandatorias de negocio:
 * 1. Solo existe 1 landing activa por curso/producto (en canal tutor oficial).
 * 2. Si entra una landing de promoción activa, releva a la landing activa previa pasándola a 'pendiente'.
 * 3. La landing de promoción debe registrar un `fallbackLandingId` para continuar tras su vigencia.
 * 4. Máximo 5 landings en estado 'pendiente' por producto (las 'archivadas' y 'expiradas' no consumen cupo).
 * 5. Landings de embajadores se aíslan por `referidoId` y también respetan el límite de 5 pendientes por embajador.
 */

export type LandingStatus = 'activa' | 'pendiente' | 'programada' | 'archivada' | 'expirada';

export const MAX_PENDING_LANDINGS_PER_PRODUCT = 5;

export interface LandingLifecycleItem {
  id: string;
  courseId?: string | null;
  productId?: string | null;
  title?: string;
  price?: number;
  isActive?: boolean;
  status?: string;
  fallbackLandingId?: string | null;
  landingType?: string | null;
  referidoId?: string | null;
  referidoName?: string | null;
  activeFrom?: Date | string | null;
  activeUntil?: Date | string | null;
  createdAt?: Date | string | null;
}

export function parseDateSafe(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    try {
      const d = (val as { toDate: () => Date }).toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.seconds === 'number') {
      const d = new Date(obj.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof obj._seconds === 'number') {
      const d = new Date(obj._seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function isAffiliateLanding(item: Pick<LandingLifecycleItem, 'referidoId' | 'referidoName' | 'landingType'>): boolean {
  return Boolean(item.referidoId || item.referidoName || item.landingType === 'referral');
}

/**
 * Determina el estado efectivo de una landing considerando sus fechas de vigencia y flags.
 */
export function getEffectiveLandingStatus(
  item: Pick<LandingLifecycleItem, 'status' | 'isActive' | 'activeFrom' | 'activeUntil'>,
  now = new Date(),
): LandingStatus {
  // 1. Estado explícito de archivada (soft delete)
  if (item.status === 'archivada') {
    return 'archivada';
  }

  const fromDate = parseDateSafe(item.activeFrom);
  const untilDate = parseDateSafe(item.activeUntil);

  // 2. Vigencia temporal: Expirada si ya superó activeUntil
  if (untilDate && now > untilDate) {
    return 'expirada';
  }

  // 3. Vigencia temporal: Programada si aún no alcanzó activeFrom
  if (fromDate && now < fromDate) {
    return 'programada';
  }

  // 4. Activa si tiene el flag o el status activo
  if (item.isActive === true || item.status === 'activa') {
    return 'activa';
  }

  // 5. Por defecto en cola de espera / borrador
  return 'pendiente';
}

/**
 * Cuenta las landings en estado 'pendiente' para un producto y ámbito específico.
 */
export function checkPendingLimit(
  pages: LandingLifecycleItem[],
  targetCourseId: string,
  isAffiliate: boolean,
  affiliateId?: string | null,
  now = new Date(),
): {
  count: number;
  maxAllowed: number;
  isLimitReached: boolean;
  pendingPages: LandingLifecycleItem[];
} {
  const matchingProductPages = pages.filter((p) => {
    const pCourse = p.courseId || p.productId;
    if (pCourse !== targetCourseId) return false;

    if (isAffiliate) {
      if (!isAffiliateLanding(p)) return false;
      if (affiliateId && p.referidoId && p.referidoId !== affiliateId) return false;
      return true;
    }

    // Ámbito oficial del tutor
    return !isAffiliateLanding(p);
  });

  const pendingPages = matchingProductPages.filter((p) => getEffectiveLandingStatus(p, now) === 'pendiente');

  const count = pendingPages.length;
  return {
    count,
    maxAllowed: MAX_PENDING_LANDINGS_PER_PRODUCT,
    isLimitReached: count >= MAX_PENDING_LANDINGS_PER_PRODUCT,
    pendingPages,
  };
}

/**
 * Plan de activación y relevo:
 * Al activar una landing, degrada cualquier otra landing activa del mismo producto a 'pendiente'.
 */
export function planLandingActivationRelay(
  pages: LandingLifecycleItem[],
  activatingLandingId: string,
  targetCourseId: string,
  isAffiliate: boolean,
  affiliateId?: string | null,
  fallbackLandingId?: string | null,
): {
  activatingId: string;
  demotedIds: string[];
  fallbackLandingId: string | null;
} {
  const demotedIds: string[] = [];

  for (const page of pages) {
    if (page.id === activatingLandingId) continue;
    const pCourse = page.courseId || page.productId;
    if (pCourse !== targetCourseId) continue;

    // Solo degradar dentro del mismo ámbito (tutor oficial no degrada a embajadores y viceversa)
    const pageIsAffiliate = isAffiliateLanding(page);
    if (pageIsAffiliate !== isAffiliate) continue;
    if (isAffiliate && affiliateId && page.referidoId && page.referidoId !== affiliateId) continue;

    if (page.isActive === true || page.status === 'activa') {
      demotedIds.push(page.id);
    }
  }

  return {
    activatingId: activatingLandingId,
    demotedIds,
    fallbackLandingId: fallbackLandingId || null,
  };
}
