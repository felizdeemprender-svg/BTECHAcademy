import { describe, it, expect } from 'vitest';
import { GetTutorPublicCatalogUseCase } from '../get-tutor-public-catalog-use-case';
import type { FirestoreGateway, DocSnapshotLike, QuerySnapshotLike } from '@/data/firestore/gateway';

class FakeGateway implements FirestoreGateway {
  private store: Map<string, Map<string, Record<string, unknown>>> = new Map();

  constructor(initialData: { [collection: string]: { [id: string]: Record<string, unknown> } } = {}) {
    for (const [col, docs] of Object.entries(initialData)) {
      const colMap = new Map<string, Record<string, unknown>>();
      for (const [id, data] of Object.entries(docs)) {
        colMap.set(id, { ...data });
      }
      this.store.set(col, colMap);
    }
  }

  async getDoc(col: string, id: string): Promise<DocSnapshotLike | null> {
    const colMap = this.store.get(col);
    const data = colMap?.get(id);
    if (!data) return { exists: false, id, data: () => undefined };
    return { exists: true, id, data: () => ({ ...data }) };
  }

  async queryByField(col: string, field: string, value: unknown): Promise<QuerySnapshotLike> {
    const colMap = this.store.get(col);
    if (!colMap) return { docs: [] };
    const docs: DocSnapshotLike[] = [];
    for (const [id, data] of colMap.entries()) {
      if (data[field] === value) {
        docs.push({ exists: true, id, data: () => ({ ...data }) });
      }
    }
    return { docs };
  }

  async listDocs(col: string): Promise<QuerySnapshotLike> {
    const colMap = this.store.get(col);
    if (!colMap) return { docs: [] };
    return {
      docs: Array.from(colMap.entries()).map(([id, data]) => ({
        exists: true,
        id,
        data: () => ({ ...data }),
      })),
    };
  }

  async createDoc(col: string, id: string, data: Record<string, unknown>): Promise<void> {
    let colMap = this.store.get(col);
    if (!colMap) {
      colMap = new Map();
      this.store.set(col, colMap);
    }
    colMap.set(id, { ...data });
  }

  async updateDoc(col: string, id: string, patch: Record<string, unknown>): Promise<void> {
    const colMap = this.store.get(col);
    const existing = colMap?.get(id) || {};
    colMap?.set(id, { ...existing, ...patch });
  }

  async deleteDoc(col: string, id: string): Promise<void> {
    this.store.get(col)?.delete(id);
  }

  serverTimestamp(): unknown {
    return new Date();
  }

  arrayUnion(...elements: unknown[]): unknown {
    return elements;
  }

  async listSubDocs(): Promise<QuerySnapshotLike> {
    return { docs: [] };
  }

  async countSubDocs(): Promise<number> {
    return 0;
  }

  async createSubDoc(): Promise<void> {}
  async updateSubDoc(): Promise<void> {}
  async deleteSubDoc(): Promise<void> {}
}

describe('GetTutorPublicCatalogUseCase', () => {
  const fakeData = {
    users: {
      'tutor-1': {
        displayName: 'Carlos Mentor',
        username: 'carlos',
        email: 'carlos@ejemplo.com',
      },
      'tutor-2': {
        displayName: 'Ana Docente',
        username: 'ana',
      },
    },
    salesPages: {
      // Oferta 1: Curso vigente de tutor-1
      'sp-curso-1': {
        mentorId: 'tutor-1',
        title: 'Curso de Finanzas',
        description: 'Domina tus números',
        imageUrl: 'https://cdn.example.com/finanzas.jpg',
        price: 15000,
        currency: 'ARS',
        isActive: true,
        type: 'course',
        pricing: {
          pricesByGateway: {
            mercadopago: { gatewayId: 'mercadopago', amount: 15000, currency: 'ARS', isActive: true },
            transfer: { gatewayId: 'transfer', amount: 13500, currency: 'ARS', isActive: true },
            stripe: { gatewayId: 'stripe', amount: 50, currency: 'USD', isActive: true },
          },
        },
      },
      // Oferta 2: Programa de tutor-1
      'sp-prog-1': {
        mentorId: 'tutor-1',
        title: 'Programa Acelerador',
        description: '12 semanas intensivas',
        price: 90000,
        currency: 'ARS',
        productType: 'programa',
        duration: { value: 12, unit: 'semanas', label: '12 semanas' },
        isActive: true,
      },
      // Oferta 3: Mentoría gratuita de tutor-1
      'sp-mentoria-1': {
        mentorId: 'tutor-1',
        title: 'Sesión Diagnóstico 1 a 1',
        price: 0,
        productType: 'mentoria',
        isActive: true,
      },
      // Oferta 4: Expirada (no vigente)
      'sp-expirada': {
        mentorId: 'tutor-1',
        title: 'Oferta Black Friday Pasada',
        isActive: true,
        activeUntil: new Date('2020-01-01').toISOString(),
      },
      // Oferta 5: De embajador (con referidoId)
      'sp-embajador': {
        mentorId: 'tutor-1',
        title: 'Landing de Afiliado Juan',
        isActive: true,
        referidoId: 'ref-999',
      },
      // Oferta 6: Desactivada
      'sp-desactivada': {
        mentorId: 'tutor-1',
        title: 'Oferta Borrador',
        isActive: false,
      },
      // Oferta 7: Perteneciente a tutor-2 (debe aislarse)
      'sp-otro-tutor': {
        mentorId: 'tutor-2',
        title: 'Curso de Ana',
        isActive: true,
      },
    },
  };

  it('debe devolver únicamente las ofertas vigentes del tutor autenticado', async () => {
    const gateway = new FakeGateway(fakeData);
    const useCase = new GetTutorPublicCatalogUseCase(gateway);

    const result = await useCase.execute('tutor-1');

    expect(result).not.toBeNull();
    expect(result?.tutor.id).toBe('tutor-1');
    expect(result?.tutor.name).toBe('Carlos Mentor');
    expect(result?.tutor.username).toBe('carlos');

    const offerIds = result?.offers.map((o) => o.id);
    expect(offerIds).toContain('sp-curso-1');
    expect(offerIds).toContain('sp-prog-1');
    expect(offerIds).toContain('sp-mentoria-1');

    // Debe excluir expiradas, desactivadas, embajadores y las de otros tutores
    expect(offerIds).not.toContain('sp-expirada');
    expect(offerIds).not.toContain('sp-embajador');
    expect(offerIds).not.toContain('sp-desactivada');
    expect(offerIds).not.toContain('sp-otro-tutor');
    expect(result?.total).toBe(3);

    const cursoOffer = result?.offers.find((o) => o.id === 'sp-curso-1');
    expect(cursoOffer?.paymentMethods).toHaveLength(3);
    expect(cursoOffer?.paymentMethods.map((m) => m.id)).toEqual(['mercadopago', 'transfer', 'stripe']);
    expect(cursoOffer?.paymentMethods[0].amount).toBe(15000);
    expect(cursoOffer?.paymentMethods[0].currency).toBe('ARS');
    expect(cursoOffer?.paymentMethods[2].amount).toBe(50);
    expect(cursoOffer?.paymentMethods[2].currency).toBe('USD');
  });

  it('debe filtrar correctamente por tipo de oferta (programa, mentoria, curso)', async () => {
    const gateway = new FakeGateway(fakeData);
    const useCase = new GetTutorPublicCatalogUseCase(gateway);

    const soloProgramas = await useCase.execute('tutor-1', { types: ['programa'] });
    expect(soloProgramas?.offers.length).toBe(1);
    expect(soloProgramas?.offers[0].id).toBe('sp-prog-1');
    expect(soloProgramas?.offers[0].type).toBe('programa');

    const soloMentorias = await useCase.execute('tutor-1', { types: ['mentoria'] });
    expect(soloMentorias?.offers.length).toBe(1);
    expect(soloMentorias?.offers[0].id).toBe('sp-mentoria-1');
    expect(soloMentorias?.offers[0].type).toBe('mentoria');
    expect(soloMentorias?.offers[0].price.isFree).toBe(true);
    expect(soloMentorias?.offers[0].price.formatted).toBe('Gratis');
  });

  it('debe filtrar por identificadores específicos combinados con tipos', async () => {
    const gateway = new FakeGateway(fakeData);
    const useCase = new GetTutorPublicCatalogUseCase(gateway);

    const especifico = await useCase.execute('tutor-1', {
      ids: ['sp-curso-1', 'sp-prog-1'],
      types: ['curso'],
    });

    expect(especifico?.offers.length).toBe(1);
    expect(especifico?.offers[0].id).toBe('sp-curso-1');
  });

  it('debe construir la URL completa de la landing con el baseUrl proporcionado', async () => {
    const gateway = new FakeGateway(fakeData);
    const useCase = new GetTutorPublicCatalogUseCase(gateway);

    const result = await useCase.execute('tutor-1', { baseUrl: 'https://feliz.fastoria.com.ar' });
    expect(result?.offers[0].url).toBe('https://feliz.fastoria.com.ar/v/sp-curso-1');
  });

  it('debe devolver null si el tutor no existe', async () => {
    const gateway = new FakeGateway(fakeData);
    const useCase = new GetTutorPublicCatalogUseCase(gateway);

    const result = await useCase.execute('tutor-inexistente');
    expect(result).toBeNull();
  });
});
