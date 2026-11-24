import { cache } from 'react';
import { GetPublicSalesPageUseCase } from '@/domain/sales-pages/use-cases/get-public-sales-page-use-case';

/**
 * Deduplicación en el ciclo de vida del request HTTP:
 * Evita consultar Firestore dos veces (una en generateMetadata y otra en el componente Page).
 */
export const getCachedPublicSalesPage = cache(async (id: string, isPreview: boolean) => {
  const useCase = new GetPublicSalesPageUseCase();
  return useCase.execute(id, isPreview);
});
