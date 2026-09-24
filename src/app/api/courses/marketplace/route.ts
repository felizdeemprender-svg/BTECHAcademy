import { NextRequest } from 'next/server';
import { resolveGateway } from '@/lib/api/gateway';
import { handleGetMarketplace } from '@/lib/api/catalog-handlers';

export const dynamic = 'force-dynamic';

// F1.2 — Ruta pública (sin auth, igual que antes). Lógica en el use-case
// `getMarketplace`: mismos filtros/sort/paginación/respuestas.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gateway = await resolveGateway();
  return handleGetMarketplace(gateway, {
    category: searchParams.get('category') || 'Todos',
    level: searchParams.get('level') || 'Todos',
    price: searchParams.get('price') || 'all',
    sortBy: searchParams.get('sortBy') || 'relevance',
    search: searchParams.get('search') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '12'),
  });
}
