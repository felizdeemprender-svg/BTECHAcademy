import { NextRequest } from 'next/server';
import { resolveGateway } from '@/lib/api/gateway';
import { handleCreateCourse } from '@/lib/api/catalog-handlers';

// F1.2 — Ruta pública (sin auth, igual que antes: el mentorId viaja en el
// body). Lógica en el use-case `createCourse`: mismos status y respuestas.
export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleCreateCourse(await resolveGateway(), body);
}
