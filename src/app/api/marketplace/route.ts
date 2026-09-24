import { resolveGateway } from '@/lib/api/gateway';
import { handleGetMarketplaceCatalog } from '@/lib/api/catalog-handlers';

export const dynamic = 'force-dynamic';

// F1.2 — Ruta pública crítica (sin auth, igual que antes). Lógica en el
// use-case `getMarketplaceCatalog`: mismos filtros/orden/respuesta.
export async function GET() {
  return handleGetMarketplaceCatalog(await resolveGateway());
}
