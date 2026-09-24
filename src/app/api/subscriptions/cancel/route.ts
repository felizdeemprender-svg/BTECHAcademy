import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { handleCancelSubscription } from '@/lib/api/billing-report-handler';

export async function POST(req: Request) {
  const caller = await authenticateCaller(req);
  return handleCancelSubscription(await resolveGateway(), caller);
}
