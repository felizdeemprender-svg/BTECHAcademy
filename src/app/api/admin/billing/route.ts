import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { resolveGateway } from '@/lib/api/gateway';
import { handleBillingReport } from '@/lib/api/billing-report-handler';

export type { BillingReport, TutorBillingRow } from '@/domain/identity/use-cases/build-billing-report';

export async function GET(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  return handleBillingReport(await resolveGateway(), { uid: adminUid, isAdmin: true }, {
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  });
}
