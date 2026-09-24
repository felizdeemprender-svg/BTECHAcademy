import { resolveGateway } from '@/lib/api/gateway';
import { handlePublicPlans } from '@/lib/api/subscription-admin-handlers';

export async function GET() {
  return handlePublicPlans(await resolveGateway(), null);
}
