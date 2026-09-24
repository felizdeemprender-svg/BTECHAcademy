import { NextRequest } from 'next/server';
import { resolveGateway } from '@/lib/api/gateway';
import { handleFreeEnrollment } from '@/lib/api/catalog-handlers';

// F1.2 — Ruta pública (sin auth, igual que antes). Valida precio 0 vía
// gateway y delega a `processSuccessfulEnrollment`: mismas respuestas.
export async function POST(req: NextRequest) {
  const body = await req.json();
  return handleFreeEnrollment(await resolveGateway(), body);
}
