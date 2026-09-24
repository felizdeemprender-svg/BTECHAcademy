import { resolveGateway } from '@/lib/api/gateway';
import { handleListInfluencers } from '@/lib/api/influencer-handlers';
// F1.3 - Ruta publica (sin auth, igual que antes). Logica en el use-case
// `listReferrals`: referidos del mentor con landings/leads enriquecidos.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return handleListInfluencers(await resolveGateway(), searchParams.get('mentorUid'));
}
