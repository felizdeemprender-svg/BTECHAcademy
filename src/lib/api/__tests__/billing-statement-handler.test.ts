import { describe, expect, it } from 'vitest';
import type { FirestoreGateway, QuerySnapshotLike } from '@/data/firestore/gateway';
import type { RawDoc } from '@/data/firestore/mappers';
import type { Caller } from '../mentor-auth';
import { handleGetBillingStatement } from '../billing-statement-handler';

type Store = Record<string, Record<string, RawDoc>>;

function makeFakeGateway(store: Store): FirestoreGateway {
  return {
    async getDoc(col: string, id: string) {
      const data = store[col]?.[id];
      if (!data) return null;
      return { exists: true, id, data: () => ({ ...data }) };
    },
    async listDocs(col: string) {
      const docs = Object.entries(store[col] || {}).map(([id, d]) => ({
        exists: true,
        id,
        data: () => ({ ...d }),
      }));
      return { docs };
    },
    async queryByField(col: string, field: string, val: unknown) {
      const docs = Object.entries(store[col] || {})
        .filter(([, d]) => d[field] === val)
        .map(([id, d]) => ({
          exists: true,
          id,
          data: () => ({ ...d }),
        }));
      return { docs };
    },
    async createDoc(col: string, id: string, data: Record<string, unknown>) {
      if (!store[col]) store[col] = {};
      store[col][id] = data as RawDoc;
    },
    async updateDoc(col: string, id: string, patch: Record<string, unknown>) {
      if (store[col]?.[id]) {
        store[col][id] = { ...store[col][id], ...patch } as RawDoc;
      }
    },
    async deleteDoc(col: string, id: string) {
      if (store[col]?.[id]) delete store[col][id];
    },
    serverTimestamp: () => new Date(),
  } as unknown as FirestoreGateway;
}

describe('handleGetBillingStatement - Reporte Financiero por Ciclo', () => {
  it('retorna 401 si no hay usuario autenticado', async () => {
    const gw = makeFakeGateway({});
    const res = await handleGetBillingStatement(gw, null, { tutorId: 'tutor1' });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('No autorizado');
  });

  it('retorna 403 si el usuario intenta acceder al reporte de otro tutor sin ser admin', async () => {
    const gw = makeFakeGateway({
      users: {
        tutor1: { displayName: 'Tutor 1' },
      },
    });
    const caller: Caller = { uid: 'otro_usuario', isAdmin: false, isSuperAdmin: false };
    const res = await handleGetBillingStatement(gw, caller, { tutorId: 'tutor1' });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Acceso denegado');
  });

  it('retorna 404 si el tutor no existe', async () => {
    const gw = makeFakeGateway({});
    const caller: Caller = { uid: 'admin_user', isAdmin: true, isSuperAdmin: true };
    const res = await handleGetBillingStatement(gw, caller, { tutorId: 'inexistente' });
    expect(res.status).toBe(404);
  });

  it('genera el reporte financiero completo con Nivel 1 (totalizado discriminado) y Nivel 2 (detalle transaccional)', async () => {
    const store: Store = {
      users: {
        tutor_angel: {
          displayName: 'Angel Tutor',
          email: 'angel@tutor.com',
          homeCountry: 'AR',
          homeCurrency: 'ARS',
          subscription: {
            id: 'sub_pro_101',
            status: 'active',
            planName: 'Plan Pro Tutor',
            amountUSD: 29,
            exchangeRate: 1200,
          },
          creditsPurchases: [
            {
              id: 'cred_500',
              credits: 500,
              amountUSD: 15,
              exchangeRate: 1200,
              currency: 'USD',
              createdAt: new Date('2026-10-05T10:00:00Z'),
            },
          ],
        },
      },
      orderLedger: {
        ord_mp_1: {
          tutorId: 'tutor_angel',
          courseId: 'curso_b2b',
          courseTitle: 'Ventas B2B',
          buyerEmail: 'alumno1@test.com',
          buyerCountry: 'AR',
          chargedAmount: 50000,
          chargedCurrency: 'ARS',
          exchangeRateToUSD: 1200,
          gatewayId: 'mercadopago',
          gatewayFee: 3000,
          status: 'completed',
          createdAt: new Date('2026-10-10T12:00:00Z'),
        },
        ord_stripe_2: {
          tutorId: 'tutor_angel',
          courseId: 'curso_b2b',
          courseTitle: 'Ventas B2B',
          buyerEmail: 'alumno2_chile@test.cl',
          buyerCountry: 'CL',
          chargedAmount: 50,
          chargedCurrency: 'USD',
          exchangeRateToUSD: 1200,
          gatewayId: 'stripe',
          gatewayFee: 2.25,
          status: 'completed',
          createdAt: new Date('2026-10-15T12:00:00Z'),
        },
      },
    };

    const gw = makeFakeGateway(store);
    const caller: Caller = { uid: 'tutor_angel', isAdmin: false, isSuperAdmin: false };

    const res = await handleGetBillingStatement(gw, caller, {
      tutorId: 'tutor_angel',
      from: '2026-10-01T00:00:00Z',
      to: '2026-10-31T23:59:59Z',
      cycleId: 'cycle_oct_2026',
      cycleLabel: 'Ciclo Octubre 2026',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const statement = body.statement;
    expect(statement.tutorId).toBe('tutor_angel');
    expect(statement.homeCurrency).toBe('ARS');
    expect(statement.cycleId).toBe('cycle_oct_2026');

    // Nivel 1: Totalizado por Concepto Discriminado
    expect(statement.sales.totalCount).toBe(2);
    expect(statement.sales.breakdownByGateway.mercadopago.grossCharged).toBe(50000);
    expect(statement.sales.breakdownByGateway.stripe.grossCharged).toBe(50);
    expect(statement.sales.totalGatewayFeesInHomeCurrency).toBe(5700); // MP: 3000 + Stripe: 2.25 * 1200 = 2700

    // Costos de plataforma
    expect(statement.platformCosts.subscriptionsTotalInHomeCurrency).toBe(34800); // 29 * 1200
    expect(statement.platformCosts.aiCreditsTotalInHomeCurrency).toBe(18000); // 15 * 1200
    expect(statement.platformCosts.totalPlatformCostsInHomeCurrency).toBe(52800);

    // Conciliación y balance
    expect(statement.reconciliation.isBalanced).toBe(true);

    // Nivel 2: Detalle transaccional (Libro Mayor)
    expect(statement.lineItems).toBeDefined();
    expect(statement.lineItems.length).toBe(4); // 2 ventas + 1 suscripción + 1 recarga IA
    expect(statement.lineItems[0].date).toBeDefined();
    expect(statement.lineItems.some((i: any) => i.type === 'course_sale')).toBe(true);
    expect(statement.lineItems.some((i: any) => i.type === 'subscription')).toBe(true);
    expect(statement.lineItems.some((i: any) => i.type === 'ai_credits')).toBe(true);
  });
});
