import { resolveGateway } from '@/lib/api/gateway';
import { handleGetPaymentOptions } from '@/lib/api/tutor-handlers';
// F1.3 - Ruta publica (sin auth, igual que antes). Logica en el use-case
// `listPaymentOptions`: metodos de pago activos sanitizados (sin accessToken).
// El param `username` en la URL es en realidad el mentorId (UID Firebase).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: mentorId } = await params;
  const url = new URL(request.url);
  const buyerCountry =
    url.searchParams.get('country') ||
    url.searchParams.get('buyerCountry') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    undefined;
  const tutorCountry = url.searchParams.get('tutorCountry') || undefined;

  return handleGetPaymentOptions(await resolveGateway(), mentorId, {
    buyerCountry,
    tutorCountry,
  });
}
