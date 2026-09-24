import { NextRequest } from 'next/server';
import { resolveGateway } from '@/lib/api/gateway';
import { handleListTutorCatalog } from '@/lib/api/catalog-handlers';

// F1.2 — Ruta pública (sin auth, igual que antes). Lógica en el use-case
// `listTutorCatalog`: mismas queries y respuesta { courses, total }.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tutorId: string }> }
) {
  const tutorId = (await params).tutorId;
  return handleListTutorCatalog(await resolveGateway(), tutorId);
}
