import { NextRequest, NextResponse } from 'next/server';

import { verifyAdmin } from '@/lib/auth/verify-admin';
import { resolveGateway } from '@/lib/api/gateway';
import { handleListTutorSubscriptions } from '@/lib/api/subscription-admin-handlers';

export async function GET(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return handleListTutorSubscriptions(await resolveGateway(), { uid: adminUid, isAdmin: true });
}
