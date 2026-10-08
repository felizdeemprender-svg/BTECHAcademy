import { NextRequest, NextResponse } from 'next/server';

import { verifyAdmin } from '@/lib/auth/verify-admin';
import { resolveGateway } from '@/lib/api/gateway';
import { handleBillingCron } from '@/lib/api/billing-report-handler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const cronSecretHeader = request.headers.get('x-cron-secret');
  const isAdmin = await verifyAdmin(request);
  const isValidCronSecret = 
    cronSecretHeader === process.env.CRON_SECRET || 
    authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isAdmin && !isValidCronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleBillingCron(await resolveGateway(), null);
}
