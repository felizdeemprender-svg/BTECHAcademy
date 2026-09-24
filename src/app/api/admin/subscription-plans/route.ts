import { NextRequest, NextResponse } from 'next/server';

import { verifyAdmin } from '@/lib/auth/verify-admin';
import { resolveGateway } from '@/lib/api/gateway';
import {
  handleCreatePlan,
  handleDeletePlan,
  handleListPlans,
  handleUpdatePlan,
} from '@/lib/api/subscription-admin-handlers';

export async function GET() {
  return handleListPlans(await resolveGateway(), null);
}

export async function POST(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Failed to create subscription plan' }, { status: 500 });
  }
  return handleCreatePlan(await resolveGateway(), { uid: adminUid, isAdmin: true }, body);
}

export async function PUT(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Failed to update subscription plan' }, { status: 500 });
  }
  return handleUpdatePlan(
    await resolveGateway(),
    { uid: adminUid, isAdmin: true },
    request.nextUrl.searchParams.get('id'),
    body,
  );
}

export async function DELETE(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return handleDeletePlan(
    await resolveGateway(),
    { uid: adminUid, isAdmin: true },
    request.nextUrl.searchParams.get('id'),
  );
}
