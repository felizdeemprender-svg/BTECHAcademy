import crypto from 'crypto';
import type { FirestoreGateway } from '@/data/firestore/gateway';
import type { TutorCatalogApiKey, ApiKeyStatus } from '@/domain/catalog/tutor-catalog-api';

const API_KEYS_COLLECTION = 'catalogApiKeys';
const USERS_COLLECTION = 'users';

const WINDOW_MS = 60 * 1000; // 1 minuto
const CIRCUIT_BREAKER_MAX_REQUESTS = 180; // Umbral de bloqueo automático

export interface ApiKeyValidationResult {
  ok: boolean;
  status?: number;
  error?: string;
  code?: string;
  tutorId?: string;
  keyDoc?: TutorCatalogApiKey;
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex');
}

export function generateRawApiKey(): string {
  const random = crypto.randomBytes(16).toString('hex');
  return `fde_live_${random}`;
}

export class CatalogApiKeyGuard {
  constructor(private readonly gateway: FirestoreGateway) {}

  /**
   * Genera o regenera una API Key para un tutor, revocando cualquier clave previa.
   */
  async generateOrRegenerateKey(tutorId: string): Promise<{ rawKey: string; keyDoc: TutorCatalogApiKey }> {
    const rawKey = generateRawApiKey();
    const hashed = hashApiKey(rawKey);
    const now = new Date().toISOString();
    const keyPrefix = rawKey.substring(0, 16) + '...';

    // 1. Verificar si el tutor ya tenía una clave previa y revocarla
    const userSnap = await this.gateway.getDoc(USERS_COLLECTION, tutorId);
    if (userSnap && userSnap.exists) {
      const userData = userSnap.data() || {};
      const prevKeyHash = (userData.catalogApiKey as any)?.hashedKey;
      if (prevKeyHash && this.gateway.updateDoc) {
        try {
          await this.gateway.updateDoc(API_KEYS_COLLECTION, prevKeyHash, {
            status: 'revoked',
            revokedAt: now,
          });
        } catch {
          // Si no existía el doc previo, continuar
        }
      }
    }

    // 2. Crear documento de la nueva clave
    const newKeyDoc: TutorCatalogApiKey = {
      key: rawKey,
      keyPrefix,
      hashedKey: hashed,
      tutorId,
      status: 'active',
      createdAt: now,
      lastUsedAt: null,
      blockedAt: null,
      blockedReason: null,
      windowStart: Date.now(),
      windowRequests: 0,
    };

    if (this.gateway.mergeDoc) {
      await this.gateway.mergeDoc(API_KEYS_COLLECTION, hashed, newKeyDoc as any);
    } else {
      await this.gateway.createDoc(API_KEYS_COLLECTION, hashed, newKeyDoc as any);
    }

    // 3. Persistir metadata en el perfil del tutor
    if (this.gateway.updateDoc) {
      await this.gateway.updateDoc(USERS_COLLECTION, tutorId, {
        catalogApiKey: {
          key: rawKey,
          keyPrefix,
          hashedKey: hashed,
          status: 'active',
          createdAt: now,
          blockedAt: null,
          blockedReason: null,
        },
      });
    }

    return { rawKey, keyDoc: newKeyDoc };
  }

  /**
   * Valida la clave recibida en la petición, aplica rate-limiting y activa el Circuit Breaker si detecta ataque.
   */
  async validateRequestKey(rawKey: string | null): Promise<ApiKeyValidationResult> {
    if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
      return {
        ok: false,
        status: 401,
        error: 'API Key requerida. Envíe la cabecera x-api-key o Authorization: Bearer <key>',
        code: 'API_KEY_REQUIRED',
      };
    }

    const hashed = hashApiKey(rawKey);
    const keySnap = await this.gateway.getDoc(API_KEYS_COLLECTION, hashed);

    if (!keySnap || !keySnap.exists) {
      return {
        ok: false,
        status: 401,
        error: 'API Key inválida o inexistente',
        code: 'API_KEY_INVALID',
      };
    }

    const keyDoc = (keySnap.data() as unknown) as TutorCatalogApiKey;

    // Verificar si está revocada
    if (keyDoc.status === 'revoked') {
      return {
        ok: false,
        status: 401,
        error: 'Esta API Key fue revocada. Por favor utilice su clave vigente.',
        code: 'API_KEY_REVOKED',
      };
    }

    // Verificar si ya fue bloqueada por el Circuit Breaker
    if (keyDoc.status === 'blocked') {
      return {
        ok: false,
        status: 403,
        error: 'API Key bloqueada por seguridad ante actividad inusual o ataque. Ingrese a su panel de control y regenere su clave.',
        code: 'API_KEY_BLOCKED',
      };
    }

    // Control de Ventana Deslizante y Circuit Breaker
    const nowMs = Date.now();
    let windowStart = keyDoc.windowStart || nowMs;
    let windowRequests = keyDoc.windowRequests || 0;

    if (nowMs - windowStart > WINDOW_MS) {
      // Ventana expiró: reiniciar contador
      windowStart = nowMs;
      windowRequests = 1;
    } else {
      windowRequests += 1;
    }

    // DISPARO DEL CIRCUIT BREAKER
    if (windowRequests > CIRCUIT_BREAKER_MAX_REQUESTS) {
      const blockedAt = new Date().toISOString();
      const blockedReason = `Circuit Breaker: Exceso crítico de solicitudes (${windowRequests} req/min). Posible ataque DDoS o scraping abusivo.`;

      if (this.gateway.updateDoc) {
        // Bloquear clave en colección de claves
        await this.gateway.updateDoc(API_KEYS_COLLECTION, hashed, {
          status: 'blocked',
          blockedAt,
          blockedReason,
          windowRequests,
        });

        // Reflejar estado bloqueado en el perfil del tutor
        await this.gateway.updateDoc(USERS_COLLECTION, keyDoc.tutorId, {
          'catalogApiKey.status': 'blocked',
          'catalogApiKey.blockedAt': blockedAt,
          'catalogApiKey.blockedReason': blockedReason,
        });
      }

      return {
        ok: false,
        status: 429,
        error: 'API Key bloqueada automáticamente por detección de tráfico abusivo (Circuit Breaker activado).',
        code: 'API_KEY_BLOCKED',
      };
    }

    // Actualizar métricas de uso si no superó el umbral
    if (this.gateway.updateDoc) {
      await this.gateway.updateDoc(API_KEYS_COLLECTION, hashed, {
        windowStart,
        windowRequests,
        lastUsedAt: new Date().toISOString(),
      });
    }

    return {
      ok: true,
      tutorId: keyDoc.tutorId,
      keyDoc,
    };
  }

  /**
   * Obtiene la metadata de la clave actual del tutor para mostrar en su panel.
   */
  async getTutorKeyInfo(tutorId: string): Promise<Partial<TutorCatalogApiKey> | null> {
    const userSnap = await this.gateway.getDoc(USERS_COLLECTION, tutorId);
    if (!userSnap || !userSnap.exists) return null;
    const userData = userSnap.data() || {};
    return (userData.catalogApiKey as Partial<TutorCatalogApiKey>) || null;
  }
}
