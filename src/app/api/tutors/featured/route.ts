import { resolveGateway } from '@/lib/api/gateway';
import { handleListFeaturedTutors } from '@/lib/api/tutor-handlers';

export const dynamic = 'force-dynamic';

// F1.3 - Ruta publica (sin auth, igual que antes). Logica en el use-case
// `listFeaturedTutors`: mismos filtros suscripcion publica/activa + limit 8.
export async function GET() {
  return handleListFeaturedTutors(await resolveGateway());
}
