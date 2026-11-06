import type { NextRequest } from 'next/server';
import { resolveGateway } from '@/lib/api/gateway';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { handleGetBillingStatement } from '@/lib/api/billing-statement-handler';

export async function GET(request: NextRequest) {
  const caller = await authenticateCaller(request);
  const { searchParams } = new URL(request.url);

  return handleGetBillingStatement(await resolveGateway(), caller, {
    tutorId: searchParams.get('tutorId') || caller?.uid || '',
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    cycleId: searchParams.get('cycleId') || undefined,
    cycleLabel: searchParams.get('cycleLabel') || undefined,
  });
}

