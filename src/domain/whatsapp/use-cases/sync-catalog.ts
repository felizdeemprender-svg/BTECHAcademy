/**
 * UC — Sincronizar catálogo de planes al knowledge RAG del bot (F2.2).
 * Lee `subscriptionPlans` + `subscription-plans` de Firestore, arma los
 * payloads de knowledge (mismo formato legacy) y los envía en bulk al worker.
 */
import type { FirestoreGateway } from '@/data/firestore/gateway';
import type { BotWorkerGateway } from '@/data/whatsapp/bot-worker-gateway';

interface CatalogPlan {
  id?: string;
  name?: string;
  price?: number;
  aiQuotas?: { totalCredits?: number };
  tokens?: number;
  description?: string;
  features?: string[];
  isActive?: boolean;
}

export interface SyncCatalogResult {
  syncedCount: number;
}

const PLAN_COLLECTIONS = ['subscriptionPlans', 'subscription-plans'];

export async function syncCatalogToBot(
  gateway: FirestoreGateway,
  worker: BotWorkerGateway,
): Promise<SyncCatalogResult> {
  const planDocs = await Promise.all(
    PLAN_COLLECTIONS.map((c) => gateway.listDocs(c)),
  );

  const plans: Array<Record<string, unknown> & { id: string }> = [];
  for (const snap of planDocs) {
    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      plans.push({ id: doc.id, ...data });
    }
  }

  const knowledgePayloads = plans.map((plan: CatalogPlan & { id?: string }) => {
    const title = `Plan Comercial Fastoria: ${plan.name || 'Plan Estándar'}`;
    const price = plan.price ? `$${plan.price} ARS / mes` : 'Precio personalizado';
    const credits = plan.aiQuotas?.totalCredits || plan.tokens || 'Consultar';
    const description = plan.description || 'Sin descripción detallada.';
    const features = Array.isArray(plan.features) ? plan.features.join(', ') : 'Acceso a plataforma y herramientas IA';

    const content = `Información Oficial de Fastoria:
- Nombre del Plan: ${plan.name}
- Precio: ${price}
- Tokens / Créditos IA incluidos: ${credits}
- Descripción: ${description}
- Beneficios y características: ${features}
- Estado: ${plan.isActive !== false ? 'Activo y disponible para contratación' : 'Inactivo'}
- Soporte: Incluye soporte técnico y acceso a la comunidad Fastoria.`;

    return {
      title,
      category: 'planes_comerciales',
      content,
      metadata: {
        planId: plan.id,
        price: plan.price,
        updatedAt: new Date().toISOString(),
      },
    };
  });

  if (knowledgePayloads.length > 0) {
    await worker.bulkKnowledge(knowledgePayloads);
  }

  return { syncedCount: knowledgePayloads.length };
}