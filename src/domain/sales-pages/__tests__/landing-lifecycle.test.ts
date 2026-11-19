import { describe, it, expect } from 'vitest';
import {
  getEffectiveLandingStatus,
  checkPendingLimit,
  planLandingActivationRelay,
  isAffiliateLanding,
  type LandingLifecycleItem,
  MAX_PENDING_LANDINGS_PER_PRODUCT,
} from '../landing-lifecycle';

describe('landing-lifecycle', () => {
  const baseDate = new Date('2026-11-18T20:00:00Z');

  describe('isAffiliateLanding', () => {
    it('detecta correctamente landings de afiliados/embajadores', () => {
      expect(isAffiliateLanding({ referidoId: 'emb-123' })).toBe(true);
      expect(isAffiliateLanding({ referidoName: 'Juan' })).toBe(true);
      expect(isAffiliateLanding({ landingType: 'referral' })).toBe(true);
      expect(isAffiliateLanding({ referidoId: null, referidoName: null, landingType: 'general' })).toBe(false);
    });
  });

  describe('getEffectiveLandingStatus', () => {
    it('retorna archivada si su status explícito es archivada', () => {
      const status = getEffectiveLandingStatus({ status: 'archivada', isActive: true }, baseDate);
      expect(status).toBe('archivada');
    });

    it('retorna expirada si la fecha activeUntil ya pasó', () => {
      const pastDate = new Date('2026-11-17T00:00:00Z');
      const status = getEffectiveLandingStatus({ isActive: true, activeUntil: pastDate }, baseDate);
      expect(status).toBe('expirada');
    });

    it('retorna programada si la fecha activeFrom está en el futuro', () => {
      const futureDate = new Date('2026-11-20T00:00:00Z');
      const status = getEffectiveLandingStatus({ isActive: true, activeFrom: futureDate }, baseDate);
      expect(status).toBe('programada');
    });

    it('retorna activa si isActive es true y está dentro de vigencia', () => {
      const futureUntil = new Date('2026-11-25T00:00:00Z');
      const status = getEffectiveLandingStatus({ isActive: true, activeUntil: futureUntil }, baseDate);
      expect(status).toBe('activa');
    });

    it('retorna pendiente si isActive es false y no está archivada/expirada', () => {
      const status = getEffectiveLandingStatus({ isActive: false }, baseDate);
      expect(status).toBe('pendiente');
    });
  });

  describe('checkPendingLimit', () => {
    it('cuenta solo las pendientes del producto objetivo y respeta el límite de 5', () => {
      const pages: LandingLifecycleItem[] = [
        { id: 'p1', courseId: 'c1', status: 'pendiente', isActive: false },
        { id: 'p2', courseId: 'c1', status: 'pendiente', isActive: false },
        { id: 'p3', courseId: 'c1', status: 'activa', isActive: true },
        { id: 'p4', courseId: 'c1', status: 'archivada', isActive: false }, // no cuenta
        { id: 'p5', courseId: 'c1', activeUntil: new Date('2026-11-10T00:00:00Z') }, // expirada, no cuenta
        { id: 'p6', courseId: 'c2', status: 'pendiente', isActive: false }, // otro curso, no cuenta
      ];

      const res = checkPendingLimit(pages, 'c1', false, null, baseDate);
      expect(res.count).toBe(2);
      expect(res.isLimitReached).toBe(false);
      expect(res.pendingPages.map((p) => p.id)).toEqual(['p1', 'p2']);
    });

    it('marca isLimitReached cuando hay 5 o más pendientes para el curso', () => {
      const pages: LandingLifecycleItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: `pend-${i + 1}`,
        courseId: 'c1',
        status: 'pendiente',
        isActive: false,
      }));

      const res = checkPendingLimit(pages, 'c1', false, null, baseDate);
      expect(res.count).toBe(5);
      expect(res.isLimitReached).toBe(true);
      expect(res.maxAllowed).toBe(MAX_PENDING_LANDINGS_PER_PRODUCT);
    });

    it('aísla las landings de embajadores por su referidoId', () => {
      const pages: LandingLifecycleItem[] = [
        { id: 'emb1_p1', courseId: 'c1', referidoId: 'emb1', status: 'pendiente' },
        { id: 'emb1_p2', courseId: 'c1', referidoId: 'emb1', status: 'pendiente' },
        { id: 'emb2_p1', courseId: 'c1', referidoId: 'emb2', status: 'pendiente' },
        { id: 'tutor_p1', courseId: 'c1', status: 'pendiente' },
      ];

      const resEmb1 = checkPendingLimit(pages, 'c1', true, 'emb1', baseDate);
      expect(resEmb1.count).toBe(2);

      const resTutor = checkPendingLimit(pages, 'c1', false, null, baseDate);
      expect(resTutor.count).toBe(1);
    });
  });

  describe('planLandingActivationRelay', () => {
    it('degrada cualquier landing activa previa del mismo curso', () => {
      const pages: LandingLifecycleItem[] = [
        { id: 'l1', courseId: 'c1', isActive: true, status: 'activa' },
        { id: 'l2', courseId: 'c1', isActive: false, status: 'pendiente' },
        { id: 'l_other', courseId: 'c2', isActive: true, status: 'activa' }, // otro curso no se toca
      ];

      const relay = planLandingActivationRelay(pages, 'l2', 'c1', false, null, 'l1');
      expect(relay.activatingId).toBe('l2');
      expect(relay.demotedIds).toEqual(['l1']);
      expect(relay.fallbackLandingId).toBe('l1');
    });

    it('no degrada landings de embajadores si se activa una landing oficial', () => {
      const pages: LandingLifecycleItem[] = [
        { id: 'l_official', courseId: 'c1', isActive: true, status: 'activa' },
        { id: 'l_affiliate', courseId: 'c1', referidoId: 'emb1', isActive: true, status: 'activa' },
        { id: 'l_new_promo', courseId: 'c1', isActive: false, status: 'pendiente' },
      ];

      const relay = planLandingActivationRelay(pages, 'l_new_promo', 'c1', false, null, 'l_official');
      expect(relay.demotedIds).toEqual(['l_official']);
      expect(relay.demotedIds).not.toContain('l_affiliate');
    });
  });
});
