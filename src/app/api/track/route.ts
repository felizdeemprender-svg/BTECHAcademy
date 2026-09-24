import { resolveGateway } from '@/lib/api/gateway';
import { handleRecordTrackEvent } from '@/lib/api/track-handlers';
// F1.3 - Ruta publica (sin auth, igual que antes). Logica en el use-case
// `recordTrackEvent`; redirect 307 con UTMs y fallback sin bloquear.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return handleRecordTrackEvent(await resolveGateway(), request, {
    pageId: searchParams.get('pageId'),
    variant: searchParams.get('v'),
    source: searchParams.get('source'),
    channel: searchParams.get('channel'),
  });
}
