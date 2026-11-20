import type { FirestoreGateway } from '@/data/firestore/gateway';
import { FirestoreTutorRepository } from '@/data/firestore/tutor-repo';
import { getTutorById } from '@/domain/identity/use-cases/get-tutor-by-id';
import { FirestorePaymentMethodRepository } from '@/data/firestore/payment-method-repo';
import { listPaymentOptions } from '@/domain/commerce/use-cases/list-payment-options';

interface MentorLandingCacheData {
  tutorResult: any;
  paymentResult: any;
  timestamp: number;
}

const mentorLandingCache = new Map<string, MentorLandingCacheData>();
export const LANDING_CACHE_TTL_MS = 60 * 1000; // 60 segundos

export function clearPublicLandingCache(): void {
  mentorLandingCache.clear();
}

export function getPublicLandingCacheSize(): number {
  return mentorLandingCache.size;
}

/**
 * Obtiene el perfil de tutor y métodos de pago con amortiguador en memoria con TTL de 60s.
 * En modo preview (bypassCache = true) consulta siempre directamente a Firestore sin cachear.
 */
export async function getCachedTutorAndPayments(
  gateway: FirestoreGateway,
  mentorId: string,
  bypassCache: boolean = false,
) {
  const now = Date.now();

  if (!bypassCache) {
    const cached = mentorLandingCache.get(mentorId);
    if (cached && now - cached.timestamp < LANDING_CACHE_TTL_MS) {
      return {
        tutorResult: cached.tutorResult,
        paymentResult: cached.paymentResult,
        fromCache: true,
      };
    }
  }

  const [tutorResult, paymentResult] = await Promise.all([
    getTutorById(new FirestoreTutorRepository(gateway), { id: mentorId }).catch((err) => {
      console.warn('[SSR Landing] Error loading tutor:', err);
      return null;
    }),
    listPaymentOptions(new FirestorePaymentMethodRepository(gateway), { mentorId }).catch((err) => {
      console.warn('[SSR Landing] Error loading payment methods:', err);
      return null;
    }),
  ]);

  if (!bypassCache) {
    mentorLandingCache.set(mentorId, {
      tutorResult,
      paymentResult,
      timestamp: now,
    });
  }

  return {
    tutorResult,
    paymentResult,
    fromCache: false,
  };
}
