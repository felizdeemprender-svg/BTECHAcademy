import { resolveGateway } from '@/lib/api/gateway';
import { handleResolveSalesPage } from '@/lib/api/sales-page-handlers';
// F1.3 - Ruta publica (sin auth, igual que antes). Logica en el use-case
// `resolveSalesPage`: match mentor+slug y fallback solo-slug.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return handleResolveSalesPage(await resolveGateway(), {
    username: searchParams.get('u'),
    slug: searchParams.get('s'),
  });
}
