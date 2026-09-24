import { resolveGateway } from '@/lib/api/gateway';
import { handleGetTutorById } from '@/lib/api/tutor-handlers';
// F1.3 - Ruta publica (sin auth, igual que antes). Logica en el use-case
// `getTutorById`: solo info publica/branding del tutor.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handleGetTutorById(await resolveGateway(), id);
}
