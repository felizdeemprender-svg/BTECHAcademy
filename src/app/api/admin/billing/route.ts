import type { NextRequest } from 'next/server';

import { resolveGateway } from '@/lib/api/gateway';
import { handleBillingReport } from '@/lib/api/billing-report-handler';

export type { BillingReport, TutorBillingRow } from '@/domain/identity/use-cases/build-billing-report';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return handleBillingReport(await resolveGateway(), null, {
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  });
}
