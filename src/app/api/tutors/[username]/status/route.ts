import { resolveGateway } from '@/lib/api/gateway';
import { handleGetTutorStatus } from '@/lib/api/tutor-handlers';
// F1.3 - Ruta publica (sin auth, igual que antes). Logica en el use-case
// `getTutorStatus`: busqueda por username, chequeo suscripcion/perfil,
// conteo de cursos y brand/style remoto (via repo) cuando falla el local.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  return handleGetTutorStatus(await resolveGateway(), username);
}
