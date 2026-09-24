import { resolveGateway } from '@/lib/api/gateway';
import { handlePromoteInfluencer } from '@/lib/api/influencer-handlers';
// F1.3 - Ruta publica (sin auth, igual que antes). Logica en el use-case
// `promoteInfluencer`: verifica mentor, busca por email y asocia referido.
export async function POST(request: Request) {
  const body = await request.json();
  return handlePromoteInfluencer(await resolveGateway(), body);
}
