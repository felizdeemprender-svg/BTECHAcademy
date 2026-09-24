/**
 * Capa de datos — Repositorio de métodos de pago (F0.2).
 * Mismas colecciones y filtros que los routes legacy:
 * `systemPaymentMethods` (`isActive ==`), subcolección
 * `users/{uid}/paymentMethods` (filtro en memoria sobre
 * `listSubDocs`: `type ==` + `isActive ==`, mismo resultado),
 * `users` (perfil + fallback `profile.mercadopago`) y
 * `mp_seller_mappings` (doc por sellerId).
 */
import type {
  MentorPaymentProfile,
  PaymentMethodRepository,
  SystemPaymentMethodSnapshot,
  TutorPaymentMethodSnapshot,
} from '@/domain/commerce/payment-method-repository';

import type { FirestoreGateway } from './gateway';

const SYSTEM_METHODS = 'systemPaymentMethods';
const USERS = 'users';
const PAYMENT_METHODS = 'paymentMethods';
const SELLER_MAPPINGS = 'mp_seller_mappings';

function mapSystemMethod(id: string, raw: Record<string, unknown>): SystemPaymentMethodSnapshot {
  return {
    id,
    name: raw.name,
    type: raw.type,
    description: raw.description,
    icon: raw.icon,
    isActive: raw.isActive,
    config: (raw.config as Record<string, unknown> | undefined) ?? {},
  };
}

function mapTutorMethod(id: string, raw: Record<string, unknown>): TutorPaymentMethodSnapshot {
  return {
    id,
    name: raw.name,
    type: raw.type,
    isActive: raw.isActive,
    config: (raw.config as Record<string, unknown> | undefined) ?? {},
  };
}

export class FirestorePaymentMethodRepository implements PaymentMethodRepository {
  constructor(private readonly gateway: FirestoreGateway) {}

  async findSystemMethodById(id: string): Promise<SystemPaymentMethodSnapshot | null> {
    const snap = await this.gateway.getDoc(SYSTEM_METHODS, id);
    if (!snap) return null;
    return mapSystemMethod(snap.id, snap.data() ?? {});
  }

  async findFirstActiveSystemMethod(): Promise<SystemPaymentMethodSnapshot | null> {
    const snap = await this.gateway.queryByField(SYSTEM_METHODS, 'isActive', true, 1);
    const first = snap.docs[0];
    if (!first) return null;
    return mapSystemMethod(first.id, first.data() ?? {});
  }

  async listActiveSystemMethods(): Promise<SystemPaymentMethodSnapshot[]> {
    const snap = await this.gateway.queryByField(SYSTEM_METHODS, 'isActive', true);
    return snap.docs.map((d) => mapSystemMethod(d.id, d.data() ?? {}));
  }

  async findTutorMethodByType(
    mentorId: string,
    type: string,
  ): Promise<TutorPaymentMethodSnapshot | null> {
    const snap = await this.gateway.listSubDocs(USERS, mentorId, PAYMENT_METHODS);
    const found = snap.docs.find((d) => {
      const raw = d.data() ?? {};
      return raw.type === type && raw.isActive === true;
    });
    if (!found) return null;
    return mapTutorMethod(found.id, found.data() ?? {});
  }

  async hasActiveTutorMethod(uid: string): Promise<boolean> {
    const snap = await this.gateway.listSubDocs(USERS, uid, PAYMENT_METHODS);
    return snap.docs.some((d) => (d.data() ?? {}).isActive === true);
  }

  /**
   * F1.3 (aditivo) — Todos los `users/{mentorId}/paymentMethods` con
   * `isActive === true` en memoria (`payment-options` no tiene índice
   * compuesto; mismo resultado que el where del legacy).
   */
  async listActiveTutorMethods(mentorId: string): Promise<TutorPaymentMethodSnapshot[]> {
    const snap = await this.gateway.listSubDocs(USERS, mentorId, PAYMENT_METHODS);
    return snap.docs
      .filter((d) => (d.data() ?? {}).isActive === true)
      .map((d) => mapTutorMethod(d.id, d.data() ?? {}));
  }

  async getMentorProfile(uid: string): Promise<MentorPaymentProfile | null> {
    const snap = await this.gateway.getDoc(USERS, uid);
    if (!snap) return null;
    const raw = snap.data() ?? {};
    const profile = (raw.profile as Record<string, unknown> | undefined) ?? {};
    return {
      uid: snap.id,
      email: raw.email,
      displayName: raw.displayName,
      mercadopagoConfig: (profile.mercadopago as Record<string, unknown> | undefined) ?? undefined,
    };
  }

  async findMentorIdBySellerId(sellerId: string): Promise<string | null> {
    const snap = await this.gateway.getDoc(SELLER_MAPPINGS, sellerId);
    if (!snap) return null;
    const mentorId = (snap.data() ?? {}).mentorId;
    return typeof mentorId === 'string' ? mentorId : null;
  }
}
